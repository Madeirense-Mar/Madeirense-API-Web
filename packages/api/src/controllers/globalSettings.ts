import {
    type Request,
    type Response
} from 'express';

import { randomUUID } from 'crypto';

import {
    $Enums,
    type Global_Settings
} from '@Madeirense/database';

import {
    type API$Types,
    type applicationSettingsType
} from '@Madeirense/shared';

import {
    handleControllerError
} from './utilities/handlers';

import prisma from '../lib/prisma';

import type {
    IAuthenticatedRequest
} from '../interfaces';

// ***************************************************************************************************************

export const getRestaurantTheme = async (
    req: Request,
    res: Response<API$Types.response<$Enums.Application_Theme_theme | undefined>>
) => {
    try {
        const application_Theme = await prisma.application_Theme.findFirst({
            where: {
                restaurant_id: parseInt(req.params["restaurant_id"] as string) as number
            }
        });

        if (!application_Theme) return res.status(404).json({
            data: undefined,
            message: `There are no saved theme settings for this restaurant`,
            success: false
        });

        return res.status(200).json({
            data: application_Theme.theme,
            message: `Fetched application theme`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}

export const getGlobalSettings = async (
    req: Request,
    res: Response<API$Types.response<Global_Settings | undefined>>
) => {
    try {
        const global_settings = await prisma.global_Settings.findFirst({
            include: {
                Global_Settings_Eligible_Payment_Types: {
                    select: {
                        payment_method: true
                    }
                }
            }
        });

        if (!global_settings) return res.status(404).json({
            data: undefined,
            message: `There are no saved settings`,
            success: false
        });

        return res.status(200).json({
            data: global_settings,
            message: `Fetched settings`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getGlobalSettingsVersion = async (
    req: Request,
    res: Response<API$Types.response<string | undefined>>
) => {
    try {
        const global_settings = await prisma.global_Settings.findFirst();

        if (!global_settings) return res.status(404).json({
            data: undefined,
            message: `There are no saved settings`,
            success: false
        });

        return res.status(200).json({
            data: global_settings.change_version,
            message: `Fetched settings version`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getGlobalEligiblePayments = async (
    req: Request,
    res: Response<API$Types.response<$Enums.Global_Settings_Eligible_Payment_Types_payment_method[] | undefined>>
) => {
    try {
        const global_settings = await prisma.global_Settings.findFirst({
            include: {
                Global_Settings_Eligible_Payment_Types: {
                    select: {
                        payment_method: true
                    }
                }
            }
        });

        if (!global_settings) return res.status(404).json({
            data: undefined,
            message: `There are no saved settings`,
            success: false
        });

        return res.status(200).json({
            data: global_settings.Global_Settings_Eligible_Payment_Types.map(({ payment_method }) => payment_method),
            message: `Fetched eligible payments`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const updateGlobalSettings = async (
    req: IAuthenticatedRequest<any, Omit<Global_Settings, 'setting_id'>>,
    res: Response<API$Types.response<Global_Settings | undefined>>
) => {
    const payload = {
        ...req.body,
        change_version: randomUUID()
    };

    const setting_id = parseInt(req.params.id as string);

    let global_settings: applicationSettingsType | null = null;

    try {
        global_settings = await prisma.global_Settings.upsert({
            where: { setting_id },
            create: payload,
            update: payload,
            include: {
                Global_Settings_Eligible_Payment_Types: {
                    select: {
                        payment_method: true
                    }
                }
            }
        });

        if (!global_settings) return res.status(404).json({
            data: undefined,
            message: `There are no saved settings`,
            success: false
        });

        return res.status(200).json({
            success: true,
            message: `Updated settings`,
            data: global_settings
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!global_settings) return;

        req.events?.global_settings.emit('global_settings.updated', global_settings);
    }
};

export const updateEligiblePayments = async (req: IAuthenticatedRequest, res: Response) => {
    const { payments } = req.body as { payments: $Enums.Global_Settings_Eligible_Payment_Types_payment_method[] };

    const setting_id = parseInt(req.params.id as string);

    let global_settings: applicationSettingsType | null = null;

    try {
        await prisma.global_Settings_Eligible_Payment_Types.deleteMany({
            where: { setting_id }
        });

        global_settings = await prisma.global_Settings.findUnique({
            where: { setting_id },
            include: {
                Global_Settings_Eligible_Payment_Types: {
                    select: {
                        payment_method: true
                    }
                }
            }
        });

        if (!global_settings) return res.status(404).json({
            success: false,
            message: `There are no saved settings`,
        });

        await prisma.global_Settings_Eligible_Payment_Types.createMany({
            data: payments.map(payment_method => ({
                setting_id,
                payment_method
            }))
        });

        global_settings = await prisma.global_Settings.findUnique({
            where: { setting_id },
            include: {
                Global_Settings_Eligible_Payment_Types: {
                    select: {
                        payment_method: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: `Updated app's eligible payment methods`,
            data: global_settings
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!global_settings) return;

        req.events?.global_settings.SILENT$emit('global_settings.change_version.updated');

        req.events?.global_settings.emit(
            'global_settings.eligible_payment_types.updated',
            global_settings
        );
    }
};