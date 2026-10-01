import jwt from 'jsonwebtoken';

import env from 'env';

import type {
    JWTPayloadType
} from '../types';

// ***************************************************************************************************************

export const generateToken = (user: any, type: ('SESSION' | 'REFRESH' | '') = ''): string => {
    const payload: JWTPayloadType = {
        userId: user.user_id,
        email: user.email,
        role: user.user_role
    };

    const secret = type === 'REFRESH'
        ? (env.JWT_REFRESH_SECRET ?? '')
        : type === 'SESSION'
            ? (env.JWT_SESSION_SECRET ?? '')
            : '';

    return jwt.sign(
        payload,
        secret,
        {
            expiresIn: env.JWT_EXPIRE || '7d'
        } as jwt.SignOptions
    );
};

export type ticketTokenPayloadType = {
    ticketId: number;
    eventId: number;
};

/**
 * Signs a compact, tamper-proof pointer to a purchased ticket — this is
 * what gets encoded into the QR code shown in the mobile app
 * (validate_ticket_screen.dart scans it back). Deliberately has no
 * `expiresIn`: a ticket's validity is governed by its own
 * `expiry_date`/`expired` columns in Tickets_Purchased (checked in
 * validateTicket below), not by the token's age, so the token itself
 * never needs to expire or be regenerated — it's checked fresh against
 * the DB every time it's scanned.
 *
 * Signed with the general-purpose JWT_SECRET, not JWT_SESSION_SECRET /
 * JWT_REFRESH_SECRET — this isn't a session/auth token, so it
 * deliberately doesn't share a secret with those.
 */
export const generateTicketToken = (ticket: {
    ticket_id: number;
    event_id: number;
}): string => {
    const payload: ticketTokenPayloadType = {
        ticketId: ticket.ticket_id,
        eventId: ticket.event_id
    };

    return jwt.sign(
        payload,
        env.JWT_SECRET
    );
};

/**
 * Throws (jwt's own JsonWebTokenError/TokenExpiredError/etc.) on a
 * missing, malformed or tampered-with token — callers (validateTicket)
 * are expected to catch via the usual handleControllerError path rather
 * than pre-checking.
 */
export const verifyTicketToken = (token: string): ticketTokenPayloadType => {
    return jwt.verify(token, env.JWT_SECRET) as ticketTokenPayloadType;
};
