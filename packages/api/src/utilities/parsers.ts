import {
    type Request
} from 'express';

import {
    API$Enumerators,
    type platformType,
    type tokenObjectType
} from '@Madeirense/shared';

// ***************************************************************************************************************

export const parseTokensFromRequest = (req: Request): tokenObjectType => {
    const platform: platformType = (req.headers[API$Enumerators.Headers.platform] as platformType ?? 'web');

    let [recoveryToken, refreshToken, sessionToken] = ['', '', ''];

    switch (platform) {
        case 'mobile':
        case 'service':
            recoveryToken = "";
            refreshToken = "";

            const token = req.headers["authorization"];
            sessionToken = !token ? "" : (token.split(" ")[1] as string);

            break;

        default:
            ({
                recoveryToken = '',
                refreshToken = '',
                sessionToken = '',
            } = parseJWTTokensFromHeaderCookies((req.headers.cookie ?? '')));

            break;
    }

    return {
        recoveryToken,
        refreshToken,
        sessionToken
    };
};

export const parseJWTTokensFromHeaderCookies = (cookie: string): tokenObjectType => {
    const tokens = {
        recoveryToken: '',
        refreshToken: '',
        sessionToken: ''
    };

    if (cookie === '') return tokens;

    cookie.replace(/\s/g, '').split(';')
        .filter(cookie => ['recoveryToken', 'refreshToken', 'sessionToken'].some(k => cookie.includes(`${k}=`)))
        .forEach(token => {
            const [key, value] = token.split('=') as string[];

            (tokens as Record<string, string>)[key as string] = value as string;
        });

    return tokens;
};