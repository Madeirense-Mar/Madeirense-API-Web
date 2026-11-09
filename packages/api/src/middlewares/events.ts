import Events from '../events/index.js';

import type {
    NextFunction,
    Request
} from 'express';
import type { IApplicationRequest } from './settingsPropagation.js';

// ***************************************************************************************************************

export interface IEventfulRequest<
    Params = Record<string, string>,
    Body = any
> extends IApplicationRequest<Params, Body> {
    events?: typeof import('../events/index').default;
};

export const activateEvents = async (
    req: IEventfulRequest,
    res: Response,
    next: NextFunction
) => {
    req.events = Events;

    next();
};