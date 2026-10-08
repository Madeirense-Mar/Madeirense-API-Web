import {
    createHash,
    randomBytes,
    timingSafeEqual
} from 'crypto';

import {
    type Api_Keys,
    type $Enums
} from '@Madeirense/database';

import env from '../env';

import { prisma } from '../lib/prisma';

import { scoped } from '../lib/logger';

// ***************************************************************************************************************

/**
 * # API keys
 *
 * Keys look like `mdr_live_<43 url-safe chars>` (`mdr_test_…` outside
 * production) — 256 bits of randomness. Only `sha256(key)` is persisted, so
 * the plaintext exists in exactly two places: the response of
 * {@link createApiKey} (shown once on the management page) and wherever the
 * app that uses it keeps it.
 *
 * Lookups are cached in memory for `API_KEY_CACHE_TTL_MS` so a valid key
 * costs one DB read per minute, not one per request; usage counters are
 * buffered and flushed every 30s for the same reason. Creating or revoking a
 * key through this module clears the cache immediately. If the API ever runs
 * as several PM2 instances, other instances pick a revocation up within one
 * cache TTL.
 */

const log = scoped('api-keys');

export const API_KEY_HEADER = 'x-api-key';

export type apiKeyUsageType = $Enums.Api_Keys_usage_type;

export const API_KEY_USAGE_TYPES: apiKeyUsageType[] = ['web', 'mobile', 'developer', 'shareholder', 'service', 'other'];

/** What gets attached to `req.apiKey` — never contains the key or its hash. */
export type resolvedApiKeyType = {
    key_id: number;
    name: string;
    usage_type: apiKeyUsageType;
    key_prefix: string;
    expires_at: Date | null;
};

export type apiKeyFailureType = 'MISSING' | 'MALFORMED' | 'UNKNOWN' | 'REVOKED' | 'EXPIRED';

const KEY_PATTERN = /^mdr_(live|test)_[A-Za-z0-9_-]{43}$/;

const PREFIX_VISIBLE_CHARS = 6;

export const hashApiKey = (key: string) => createHash('sha256').update(key, 'utf8').digest('hex');

const generatePlainKey = () => `mdr_${env.NODE_ENV === 'production' ? 'live' : 'test'}_${randomBytes(32).toString('base64url')}`;

// --------------------------------------------------------------------------------------------- Cache

type cacheEntry = {
    expiresAt: number;
    record: (Pick<Api_Keys, 'key_id' | 'name' | 'usage_type' | 'key_prefix' | 'key_hash' | 'expires_at' | 'revoked_at'>) | null;
};

const cache = new Map<string, cacheEntry>();

const MAX_CACHE_ENTRIES = 5000;

export const clearApiKeyCache = () => cache.clear();

const remember = (hash: string, record: cacheEntry['record']) => {
    if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();

    cache.set(hash, { record, expiresAt: Date.now() + env.API_KEY_CACHE_TTL_MS });
};

// --------------------------------------------------------------------------------------------- Usage buffer

type usageEntry = { count: number, lastUsedAt: Date, ip: string | undefined };

const usage = new Map<number, usageEntry>();

const recordUsage = (key_id: number, ip: string | undefined) => {
    const entry = usage.get(key_id);

    if (entry) {
        entry.count += 1;
        entry.lastUsedAt = new Date();
        entry.ip = ip ?? entry.ip;
    } else {
        usage.set(key_id, { count: 1, lastUsedAt: new Date(), ip });
    }
};

/** Writes buffered usage counters to the DB. Called on an interval and on shutdown. */
export const flushApiKeyUsage = async () => {
    if (usage.size === 0) return;

    const pending = [...usage.entries()];

    usage.clear();

    await Promise.all(pending.map(([key_id, { count, lastUsedAt, ip }]) => prisma.api_Keys.update({
        where: { key_id },
        data: {
            usage_count: { increment: count },
            last_used_at: lastUsedAt,
            last_used_ip: ip?.slice(0, 45) ?? null
        }
    }).catch(error => log.warn('Failed to flush API key usage', { key_id, error }))));
};

setInterval(() => { void flushApiKeyUsage(); }, 30_000).unref();

// --------------------------------------------------------------------------------------------- Verification

/**
 * Resolves a presented key to its record, or the reason it was rejected.
 * Constant-time compare on the hash guards against timing probes even though
 * the lookup itself is by hash.
 */
export const verifyApiKey = async (presented: string | undefined, ip?: string): Promise<
    { ok: true, key: resolvedApiKeyType } | { ok: false, reason: apiKeyFailureType }
> => {
    if (!presented) return { ok: false, reason: 'MISSING' };

    const key = presented.trim();

    if (!KEY_PATTERN.test(key)) return { ok: false, reason: 'MALFORMED' };

    const hash = hashApiKey(key);

    let entry = cache.get(hash);

    if (!entry || entry.expiresAt < Date.now()) {
        const record = await prisma.api_Keys.findUnique({
            where: { key_hash: hash },
            select: {
                key_id: true,
                name: true,
                usage_type: true,
                key_prefix: true,
                key_hash: true,
                expires_at: true,
                revoked_at: true
            }
        });

        remember(hash, record);

        entry = cache.get(hash)!;
    }

    const record = entry.record;

    if (!record || !timingSafeEqual(Buffer.from(record.key_hash), Buffer.from(hash))) return { ok: false, reason: 'UNKNOWN' };

    if (record.revoked_at) return { ok: false, reason: 'REVOKED' };

    if (record.expires_at && record.expires_at.getTime() <= Date.now()) return { ok: false, reason: 'EXPIRED' };

    recordUsage(record.key_id, ip);

    return {
        ok: true,
        key: {
            key_id: record.key_id,
            name: record.name,
            usage_type: record.usage_type,
            key_prefix: record.key_prefix,
            expires_at: record.expires_at
        }
    };
};

// --------------------------------------------------------------------------------------------- Management

export type apiKeyListItemType = Omit<Api_Keys, 'key_hash' | 'usage_count'> & {
    usage_count: number;
    status: 'active' | 'expired' | 'revoked';
    created_by_name: string | null;
    revoked_by_name: string | null;
};

export const getApiKeyStatus = (key: Pick<Api_Keys, 'revoked_at' | 'expires_at'>): apiKeyListItemType['status'] => {
    if (key.revoked_at) return 'revoked';

    if (key.expires_at && key.expires_at.getTime() <= Date.now()) return 'expired';

    return 'active';
};

export const listApiKeys = async ({ includeInactive = false } = {}): Promise<apiKeyListItemType[]> => {
    // Make the counters shown on the page current.
    await flushApiKeyUsage();

    const keys = await prisma.api_Keys.findMany({
        where: includeInactive ? {} : {
            revoked_at: null,
            OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }]
        },
        orderBy: [{ revoked_at: 'asc' }, { created_at: 'desc' }]
    });

    const userIds = [...new Set(keys.flatMap(k => [k.created_by, k.revoked_by]).filter((id): id is number => id !== null))];

    const users = userIds.length ? await prisma.users.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, name: true }
    }) : [];

    const nameOf = (id: number | null) => (id === null ? null : users.find(u => u.user_id === id)?.name ?? `#${id}`);

    return keys.map(({ key_hash: _hash, usage_count, ...key }) => ({
        ...key,
        usage_count: Number(usage_count),
        status: getApiKeyStatus(key),
        created_by_name: nameOf(key.created_by),
        revoked_by_name: nameOf(key.revoked_by)
    }));
};

export const createApiKey = async ({
    name,
    usage_type,
    description,
    expires_at,
    created_by
}: {
    name: string;
    usage_type: apiKeyUsageType;
    description?: string | null;
    expires_at: Date | null;
    created_by: number;
}) => {
    const plain = generatePlainKey();

    const record = await prisma.api_Keys.create({
        data: {
            name: name.trim().slice(0, 100),
            usage_type,
            description: description?.trim().slice(0, 500) || null,
            key_prefix: plain.slice(0, plain.indexOf('_', 4) + 1 + PREFIX_VISIBLE_CHARS),
            key_hash: hashApiKey(plain),
            expires_at,
            created_by
        }
    });

    clearApiKeyCache();

    log.info(`API key created: "${record.name}" (${record.usage_type})`, {
        key_id: record.key_id,
        key_prefix: record.key_prefix,
        created_by,
        expires_at
    });

    return { plain, record };
};

export const revokeApiKey = async (key_id: number, revoked_by: number) => {
    const record = await prisma.api_Keys.update({
        where: { key_id },
        data: { revoked_at: new Date(), revoked_by }
    });

    clearApiKeyCache();

    log.warn(`API key revoked: "${record.name}"`, { key_id, key_prefix: record.key_prefix, revoked_by });

    return record;
};
