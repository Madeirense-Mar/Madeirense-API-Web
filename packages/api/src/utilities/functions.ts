import { pbkdf2Sync, createHash } from 'crypto';

import {
    REDIS_CACHE_PREFIX
} from './constants';

import env from 'env';

import type {
    IApplicationRequest
} from 'middlewares/settingsPropagation';

// ***************************************************************************************************************

export function buildCacheKey(
    controller: string,
    req: IApplicationRequest,
    keyShape?: object
) {
    const hash = createHash("sha1");

    return [
        REDIS_CACHE_PREFIX,
        req.changeVersion,
        keyShape ? hash.update(JSON.stringify(keyShape)).digest("hex") : null,
        controller.toLowerCase()
    ]
        .filter(v => v)
        .join(":");
};

export const encryptPassword = (password: string) => {
    if (!env.PASSWORD_ENCRYPTION_SALT) throw new Error('Encryption is missing some salt 🧂');

    return pbkdf2Sync(
        password,
        env.PASSWORD_ENCRYPTION_SALT as string,
        env.PASSWORD_ENCRYPTION_ITERATOR,
        64,
        'sha512'
    ).toString('hex');
};