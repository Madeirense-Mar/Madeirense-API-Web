import { type API$Types } from "@Madeirense/shared";

import { 
    type Response
} from "express";

import { logger } from "../../lib/logger";

// ***************************************************************************************************************

export async function handleControllerError<code extends string = "">(
    response: Response<API$Types.response<any, code>>,
    error: unknown
) {
    // Every controller funnels its failures through here, so this one line
    // is what puts (almost) every API error — with its stack and the
    // request id/user from the log context — into error-*.log.
    logger.error((error as Error)?.message ?? String(error), {
        scope: 'controller',
        error: error instanceof Error ? error : new Error(String(error))
    });

    switch (true) {
        default: return response.status(500).json({
            data: undefined,
            code: 'API_GENERIC_ERROR',
            httpStatus: 500,
            message: (error as Error).message,
            success: false,
        });
    }
};
