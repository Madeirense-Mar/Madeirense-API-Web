import {
    type Request,
    type Response
} from 'express';

import jwt from 'jsonwebtoken';

import {
    type $Enums
} from '@Madeirense/database';

import {
    RESTAURANT_USER_ROLES,
    type API$Types
} from '@Madeirense/shared';

import env from '../env';

import { prisma } from '../lib/prisma';

import { scoped } from '../lib/logger';

import { queueMail } from '../services/mailer';

import {
    getEmailTemplateMeta,
    listEmailTemplates,
    renderEmail,
    type emailTemplateMetaType
} from '../services/emailTemplates';

import { handleControllerError } from './utilities/handlers';

import type { IAuthenticatedRequest } from '../interfaces';

// ***************************************************************************************************************

/**
 * # E-mail notifications
 *
 * E-mail counterpart of controllers/pushNotifications.ts. Two layers:
 *
 * 1. Generic senders — {@link emailUser}, {@link emailUsers},
 *    {@link emailAudience}: load the recipient(s), render a template from
 *    `content/emails/`, queue it. Never throw.
 * 2. Domain senders used by the event emitters / controllers —
 *    {@link emailOrderStatus}, {@link emailTicketPurchase},
 *    {@link emailEventCancelled}, {@link emailPaymentResult},
 *    {@link emailWelcome}. Each re-reads what it needs from the DB, so
 *    callers only pass ids.
 *
 * Templates with `category: marketing` skip users who unsubscribed
 * (`Users.email_marketing = 0`) and carry a one-click unsubscribe link/header.
 */

const log = scoped('email');

type recipientType = {
    user_id: number;
    name: string;
    email: string;
    email_marketing: boolean;
    user_role: $Enums.Users_user_role;
};

const RECIPIENT_SELECT = {
    user_id: true,
    name: true,
    email: true,
    email_marketing: true,
    user_role: true
} as const;

/** System/Ghost accounts and placeholder addresses never receive e-mail. */
const isDeliverable = (user: recipientType) => (
    !['System', 'Ghost'].includes(user.user_role)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)
);

const apiBase = () => {
    const base = env.API_URL.replace(/\/+$/, '');

    return base.endsWith('/api') ? base : `${base}/api`;
};

const frontend = (path = '') => `${env.FRONTEND_URL.replace(/\/+$/, '')}${path}`;

const UNSUBSCRIBE_PURPOSE = 'email-unsubscribe';

const unsubscribeSecret = () => env.JWT_SECRET || env.SESSION_SECRET;

export const unsubscribeUrl = (user_id: number) => `${apiBase()}/v1/emails/unsubscribe?token=${encodeURIComponent(
    jwt.sign({ sub: String(user_id), purpose: UNSUBSCRIBE_PURPOSE }, unsubscribeSecret())
)}`;

const userVariables = (user: recipientType) => ({
    user: {
        user_id: user.user_id,
        name: user.name,
        first_name: user.name.trim().split(/\s+/)[0] ?? user.name,
        email: user.email
    }
});

// --------------------------------------------------------------------------------------------- Generic senders

/** Renders + queues one template for one already-loaded user. Returns false if skipped. */
const deliver = (user: recipientType, template: string, variables: Record<string, unknown>, meta?: emailTemplateMetaType) => {
    if (!isDeliverable(user)) return false;

    const category = (meta ?? getEmailTemplateMeta(template)).category;

    if (category === 'marketing' && !user.email_marketing) return false;

    const unsubscribe = category === 'marketing' ? unsubscribeUrl(user.user_id) : undefined;

    const rendered = renderEmail(template, {
        ...variables,
        ...userVariables(user),
        ...(unsubscribe && { unsubscribe_url: unsubscribe })
    });

    queueMail({
        to: user.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tag: template,
        ...(unsubscribe && {
            headers: {
                'List-Unsubscribe': `<${unsubscribe}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
        })
    });

    return true;
};

export async function emailUser(user_id: number, template: string, variables: Record<string, unknown> = {}) {
    try {
        const user = await prisma.users.findUnique({ where: { user_id }, select: RECIPIENT_SELECT });

        if (!user) {
            log.warn(`E-mail "${template}" skipped: user ${user_id} not found`);

            return false;
        }

        return deliver(user, template, variables);
    } catch (error) {
        log.error(`Failed to prepare e-mail "${template}" for user ${user_id}`, { error });

        return false;
    }
};

export async function emailUsers(user_ids: number[], template: string, variables: Record<string, unknown> = {}) {
    try {
        const meta = getEmailTemplateMeta(template);

        const users = await prisma.users.findMany({
            where: { user_id: { in: [...new Set(user_ids)] } },
            select: RECIPIENT_SELECT
        });

        const queued = users.filter(user => deliver(user, template, variables, meta)).length;

        log.info(`E-mail "${template}" queued for ${queued}/${user_ids.length} users`);

        return queued;
    } catch (error) {
        log.error(`Failed to prepare batch e-mail "${template}"`, { error });

        return 0;
    }
};

export type emailAudienceType = 'customers' | 'staff' | 'drivers' | 'everyone';

const AUDIENCE_ROLES: Record<emailAudienceType, $Enums.Users_user_role[]> = {
    customers: ['Customer'],
    staff: [...RESTAURANT_USER_ROLES] as $Enums.Users_user_role[],
    drivers: ['Driver'],
    everyone: ['Customer', 'Staff', 'Admin', 'Driver']
};

/** Sends to every user of an audience, in pages of 500 to keep memory flat. */
export async function emailAudience(audience: emailAudienceType, template: string, variables: Record<string, unknown> = {}) {
    const meta = getEmailTemplateMeta(template);

    let cursor: number | undefined;
    let queued = 0;

    for (;;) {
        const users = await prisma.users.findMany({
            where: {
                user_role: { in: AUDIENCE_ROLES[audience] },
                ...(meta.category === 'marketing' && { email_marketing: true })
            },
            select: RECIPIENT_SELECT,
            orderBy: { user_id: 'asc' },
            take: 500,
            ...(cursor !== undefined && { skip: 1, cursor: { user_id: cursor } })
        });

        if (users.length === 0) break;

        queued += users.filter(user => deliver(user, template, variables, meta)).length;

        cursor = users[users.length - 1]!.user_id;
    }

    log.info(`E-mail "${template}" queued for ${queued} ${audience}`);

    return queued;
};

// --------------------------------------------------------------------------------------------- Domain senders

const ORDER_STATUS_COPY: Partial<Record<$Enums.Orders_status, { label: string, headline: string, message: string }>> = {
    confirmed: {
        label: 'confirmada',
        headline: 'A sua encomenda foi confirmada',
        message: 'O restaurante aceitou o seu pedido e vai começar a prepará-lo.'
    },
    assigned: {
        label: 'a caminho',
        headline: 'A sua encomenda está a caminho',
        message: 'Um estafeta já tem o seu pedido e está a caminho da morada de entrega.'
    },
    delivered: {
        label: 'entregue',
        headline: 'Encomenda entregue. Bom apetite!',
        message: 'A sua encomenda foi entregue. Obrigado por escolher a Madeirense.'
    },
    cancelled: {
        label: 'cancelada',
        headline: 'A sua encomenda foi cancelada',
        message: 'A sua encomenda foi cancelada. Se já efectuou o pagamento, a nossa equipa entrará em contacto sobre o reembolso.'
    }
};

/** Only the statuses in ORDER_STATUS_COPY produce an e-mail — the rest stay push-only to avoid spamming. */
export async function emailOrderStatus(order_id: number) {
    try {
        const order = await prisma.orders.findUnique({
            where: { order_id },
            include: {
                Order_Items: { include: { Products: { select: { name: true, price: true } } } },
                Restaurants: { select: { name: true } },
                Delivery_Locations: { select: { name: true, address: true, city: true } }
            }
        });

        if (!order?.status) return false;

        const copy = ORDER_STATUS_COPY[order.status];

        if (!copy) return false;

        return emailUser(order.user_id, 'order-status', {
            status: order.status,
            status_label: copy.label,
            headline: copy.headline,
            message: copy.message,
            order: {
                order_id: order.order_id,
                total_amount: order.total_amount.toString(),
                created_at: order.created_at,
                restaurant: order.Restaurants.name,
                address: [order.Delivery_Locations.address, order.Delivery_Locations.city].filter(Boolean).join(', '),
                items: order.Order_Items.map(item => ({
                    name: item.Products.name,
                    quantity: item.quantity,
                    price: item.Products.price.toString()
                }))
            },
            order_url: frontend(`/orders/${order.order_id}`)
        });
    } catch (error) {
        log.error(`Failed to prepare order-status e-mail for order ${order_id}`, { error });

        return false;
    }
};

export async function emailTicketPurchase(ticket_id: number) {
    try {
        const ticket = await prisma.tickets_Purchased.findUnique({
            where: { ticket_id },
            include: {
                Restaurant_Events: {
                    include: { Restaurants: { select: { name: true } } }
                }
            }
        });

        if (!ticket) return false;

        const event = ticket.Restaurant_Events;

        return emailUser(ticket.user_id, 'ticket-purchased', {
            ticket: {
                ticket_id: ticket.ticket_id,
                quantity: ticket.quantity ?? 1,
                price: ticket.price.toString()
            },
            event: {
                event_id: event.event_id,
                name: event.name,
                date: event.event_date,
                start_time: event.start_time,
                end_time: event.end_time,
                restaurant: event.Restaurants.name,
                thumbnail_url: event.thumbnail_url
            },
            tickets_url: frontend(`/events/${event.event_id}`)
        });
    } catch (error) {
        log.error(`Failed to prepare ticket e-mail for ticket ${ticket_id}`, { error });

        return false;
    }
};

/** Notifies every holder of a still-valid ticket that the event was cancelled. */
export async function emailEventCancelled(event_id: number) {
    try {
        const event = await prisma.restaurant_Events.findUnique({
            where: { event_id },
            include: { Restaurants: { select: { name: true } } }
        });

        if (!event) return 0;

        const holders = await prisma.tickets_Purchased.findMany({
            where: { event_id },
            select: { user_id: true },
            distinct: ['user_id']
        });

        if (holders.length === 0) return 0;

        return emailUsers(holders.map(h => h.user_id), 'event-cancelled', {
            event: {
                event_id: event.event_id,
                name: event.name,
                date: event.event_date,
                start_time: event.start_time,
                restaurant: event.Restaurants.name
            },
            events_url: frontend('/events')
        });
    } catch (error) {
        log.error(`Failed to prepare event-cancelled e-mails for event ${event_id}`, { error });

        return 0;
    }
};

export async function emailPaymentResult(payment_id: number) {
    try {
        const payment = await prisma.payments.findUnique({ where: { payment_id } });

        if (!payment || !['completed', 'failed'].includes(payment.status ?? '')) return false;

        return emailUser(payment.user_id, payment.status === 'completed' ? 'payment-completed' : 'payment-failed', {
            payment: {
                payment_id: payment.payment_id,
                order_id: payment.order_id,
                amount: payment.amount.toString(),
                method: payment.payment_method,
                created_at: payment.created_at
            },
            order_url: frontend(`/orders/${payment.order_id}`)
        });
    } catch (error) {
        log.error(`Failed to prepare payment e-mail for payment ${payment_id}`, { error });

        return false;
    }
};

export async function emailWelcome(user_id: number) {
    return emailUser(user_id, 'welcome', { app_url: frontend('/') });
};

// --------------------------------------------------------------------------------------------- HTTP handlers

export async function API$listTemplates(
    _req: IAuthenticatedRequest,
    res: Response<API$Types.response<Omit<emailTemplateMetaType, 'sample'>[] | undefined>>
) {
    try {
        return res.status(200).json({
            data: listEmailTemplates().map(({ sample: _sample, ...meta }) => meta),
            message: 'E-mail templates',
            success: true
        });
    } catch (error) {
        return handleControllerError(res, error);
    }
};

/** POST /v1/emails/send — `{ user_ids, template, variables? }` */
export async function API$send(
    req: IAuthenticatedRequest<any, { user_ids: number[], template: string, variables?: Record<string, unknown> }>,
    res: Response<API$Types.response<{ queued: number } | undefined>>
) {
    try {
        const { user_ids, template, variables = {} } = req.body;

        getEmailTemplateMeta(template); // 500s early with a clear message if it doesn't exist

        const queued = await emailUsers(user_ids, template, variables);

        return res.status(202).json({
            data: { queued },
            message: `E-mail queued for ${queued} user(s)`,
            success: true
        });
    } catch (error) {
        return handleControllerError(res, error);
    }
};

/**
 * POST /v1/emails/broadcast — announcement to a whole audience using the
 * `announcement` template: `{ audience, subject, heading, body, cta_label?, cta_url?, image_url? }`.
 * Responds immediately; sending continues in the background.
 */
export async function API$broadcast(
    req: IAuthenticatedRequest<any, {
        audience: emailAudienceType,
        subject: string,
        heading: string,
        body: string,
        cta_label?: string,
        cta_url?: string,
        image_url?: string
    }>,
    res: Response<API$Types.response<{ audience: emailAudienceType } | undefined>>
) {
    try {
        const { audience, ...announcement } = req.body;

        void emailAudience(audience, 'announcement', { announcement })
            .catch(error => log.error('Broadcast failed', { error, audience }));

        log.info(`Broadcast "${announcement.subject}" to ${audience} started by user ${req.user?.user_id}`);

        return res.status(202).json({
            data: { audience },
            message: 'Broadcast started',
            success: true
        });
    } catch (error) {
        return handleControllerError(res, error);
    }
};

const unsubscribePage = (title: string, message: string) => `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6f9;color:#1a1a1a;display:grid;place-items:center;min-height:100vh}
main{background:#fff;max-width:420px;margin:16px;padding:32px;border-radius:12px;border-top:4px solid #0b5196;box-shadow:0 1px 3px rgba(0,0,0,.08)}
h1{font-size:20px;margin:0 0 8px;color:#05223d}p{margin:0;line-height:1.5;color:#444}</style></head>
<body><main><h1>${title}</h1><p>${message}</p></main></body></html>`;

/**
 * GET/POST /v1/emails/unsubscribe?token=… — public. GET is the link in the
 * e-mail footer; POST is RFC 8058 one-click unsubscribe from the inbox UI.
 */
export async function unsubscribe(req: Request, res: Response) {
    const token = String(req.query['token'] ?? '');

    try {
        const payload = jwt.verify(token, unsubscribeSecret()) as { sub?: string, purpose?: string };

        if (payload.purpose !== UNSUBSCRIBE_PURPOSE || !payload.sub) throw new Error('Wrong token purpose');

        const user_id = parseInt(payload.sub, 10);

        await prisma.users.update({
            where: { user_id },
            data: { email_marketing: false }
        });

        log.info(`User ${user_id} unsubscribed from marketing e-mails`);

        if (req.method === 'POST') return res.status(200).send('OK');

        return res
            .status(200)
            .type('html')
            .send(unsubscribePage(
                'Subscrição cancelada',
                'Já não vai receber e-mails promocionais da Madeirense. Continuará a receber e-mails sobre as suas encomendas, pagamentos e bilhetes.'
            ));
    } catch (error) {
        log.warn('Invalid unsubscribe link used', { error: (error as Error).message });

        return res
            .status(400)
            .type('html')
            .send(unsubscribePage('Link inválido', 'Este link de cancelamento não é válido ou está incompleto.'));
    }
};
