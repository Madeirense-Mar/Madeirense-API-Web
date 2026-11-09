import prisma from 'lib/prisma';

import type {
    NextFunction,
    Request
} from 'express';

// ***************************************************************************************************************

export interface IApplicationRequest<
    Params = Record<string, string>,
    Body = any
> extends Request<Params, any, Body> {
    changeVersion?: string;
};

export const propagateChangeVersion = async (
    req: IApplicationRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const global_settings = (await prisma.global_Settings.findFirst());

        req.changeVersion = global_settings?.change_version;
    } catch (error) {
        req.changeVersion = undefined;
    }

    next();
};