import fs from 'fs';
import path from 'path';

import { randomUUID } from 'crypto';

import nodemailer, { type Transporter } from 'nodemailer';

import env from '../env';

import {
    LOG_DIR,
    scoped
} from '../lib/logger';

// ***************************************************************************************************************

/**
 * # Mailer
 *
 * Thin layer over nodemailer + a small in-memory send queue:
 *
 * - **SMTP configured** (`SMTP_HOST` set) → pooled SMTP connection.
 * - **No SMTP** → nothing is sent; each e-mail is written to
 *   `LOG_DIR/mail-previews/*.html` instead, so flows can be tested locally.
 * - **Outside production** with `MAIL_DEV_REDIRECT_TO` set → every e-mail is
 *   re-addressed to that inbox (original recipient kept in the subject).
 *
 * {@link queueMail} never throws and never blocks the request that triggered
 * it: failed sends are retried 3 times (10s → 1min → 5min) and every
 * outcome is logged under `"scope":"email"`. The queue lives in memory — a
 * restart drops whatever hadn't been sent yet (logged on shutdown).
 */

const log = scoped('email');

export type mailMessageType = {
    to: string;
    subject: string;
    html: string;
    text?: string;
    headers?: Record<string, string>;
    /** Free label for the logs, e.g. the template name. */
    tag?: string;
};

export type mailResultType = {
    id: string;
    messageId?: string;
    preview?: string;
};

export const isSmtpConfigured = () => Boolean(env.SMTP_HOST);

let transporter: Transporter | null = null;

const getTransporter = () => {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        pool: true,
        maxConnections: Math.max(1, env.MAIL_CONCURRENCY),
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined
    });

    return transporter;
};

/** Checks the SMTP credentials once at boot so a typo shows up in the logs immediately. */
export const verifyMailer = async () => {
    if (!isSmtpConfigured()) {
        log.warn(`SMTP_HOST not set — e-mails will be saved to ${path.join(LOG_DIR, 'mail-previews')} instead of being sent`);

        return false;
    }

    try {
        await getTransporter().verify();

        log.info(`SMTP ready (${env.SMTP_HOST}:${env.SMTP_PORT}) — sending as ${env.MAIL_FROM}`);

        return true;
    } catch (error) {
        log.error(`SMTP verification failed for ${env.SMTP_HOST}:${env.SMTP_PORT}`, { error });

        return false;
    }
};

const redirectIfNeeded = (message: mailMessageType): mailMessageType => {
    if (env.NODE_ENV === 'production' || !env.MAIL_DEV_REDIRECT_TO) return message;

    return {
        ...message,
        to: env.MAIL_DEV_REDIRECT_TO,
        subject: `[→ ${message.to}] ${message.subject}`
    };
};

const savePreview = (id: string, message: mailMessageType) => {
    const dir = path.join(LOG_DIR, 'mail-previews');

    fs.mkdirSync(dir, { recursive: true });

    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}_${message.tag ?? 'email'}_${id.slice(0, 8)}.html`);

    fs.writeFileSync(file, `<!-- To: ${message.to} | Subject: ${message.subject} -->\n${message.html}`, 'utf-8');

    return file;
};

/** Sends right away and throws on failure (used by the management "send test" button). */
export const sendMailNow = async (input: mailMessageType, id: string = randomUUID()): Promise<mailResultType> => {
    const message = redirectIfNeeded(input);

    if (!isSmtpConfigured()) {
        const preview = savePreview(id, message);

        log.info(`E-mail saved as preview (no SMTP): "${message.subject}" → ${message.to}`, { id, tag: message.tag, preview });

        return { id, preview };
    }

    const info = await getTransporter().sendMail({
        from: env.MAIL_FROM,
        ...(env.MAIL_REPLY_TO && { replyTo: env.MAIL_REPLY_TO }),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers
    });

    log.info(`E-mail sent: "${message.subject}" → ${message.to}`, { id, tag: message.tag, messageId: info.messageId, response: info.response });

    return { id, messageId: info.messageId };
};

// --------------------------------------------------------------------------------------------- Queue

type job = {
    id: string;
    message: mailMessageType;
    attempt: number;
};

const RETRY_DELAYS_MS = [10_000, 60_000, 300_000];

const queue: job[] = [];

let active = 0;
let scheduled = 0;

const pump = () => {
    while (active < Math.max(1, env.MAIL_CONCURRENCY) && queue.length > 0) {
        const current = queue.shift()!;

        active += 1;

        sendMailNow(current.message, current.id)
            .catch(error => {
                const delay = RETRY_DELAYS_MS[current.attempt];

                if (delay === undefined) {
                    log.error(`E-mail permanently failed after ${current.attempt + 1} attempts: "${current.message.subject}" → ${current.message.to}`, {
                        id: current.id,
                        tag: current.message.tag,
                        error
                    });

                    return;
                }

                log.warn(`E-mail failed (attempt ${current.attempt + 1}), retrying in ${delay / 1000}s: ${(error as Error).message}`, {
                    id: current.id,
                    tag: current.message.tag,
                    to: current.message.to
                });

                scheduled += 1;

                setTimeout(() => {
                    scheduled -= 1;
                    queue.push({ ...current, attempt: current.attempt + 1 });
                    pump();
                }, delay).unref();
            })
            .finally(() => {
                active -= 1;
                pump();
            });
    }
};

/** Fire-and-forget send with retries. Returns the job id used in the logs. */
export const queueMail = (message: mailMessageType) => {
    const id = randomUUID();

    if (!message.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.to)) {
        log.warn(`Skipped e-mail with invalid recipient "${message.to}"`, { tag: message.tag });

        return id;
    }

    queue.push({ id, message, attempt: 0 });

    pump();

    return id;
};

export const mailQueueStats = () => ({ queued: queue.length, sending: active, waitingRetry: scheduled });
