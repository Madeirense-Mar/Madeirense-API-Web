import {
    type Response
} from 'express';

import {
    type API$Types,
    type routeResultType
} from '@Madeirense/shared';

import {
    handleControllerError
} from './utilities/handlers';

import env from '../env';

import type {
    IAuthenticatedRequest
} from '../interfaces';

// ***************************************************************************************************************

type routeRequestBody = {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
};

/**
 * Proxies to a self-hosted OSRM instance (bound to 127.0.0.1 on the VPS,
 * never exposed publicly — see infra/osrm/README.md). Mobile/web never
 * call OSRM directly; this endpoint reuses the app's existing JWT auth
 * (validateJWT, see routes/routing.ts) instead of giving OSRM its own
 * auth layer.
 *
 * OSRM's native coordinate order is `[longitude, latitude]` (GeoJSON
 * convention) — flipped to `{ latitude, longitude }` here so nothing
 * downstream needs to know that convention exists.
 */
export const getRoute = async (
    req: IAuthenticatedRequest<{}, routeRequestBody>,
    res: Response<API$Types.response<routeResultType | undefined>>
) => {
    try {
        const { origin, destination } = req.body;

        const coordinates = [
            `${origin.longitude},${origin.latitude}`,
            `${destination.longitude},${destination.latitude}`
        ].join(';');

        const osrmURL = `${env.OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

        const osrmResponse = await fetch(osrmURL);
        const osrmData = await osrmResponse.json() as any;

        if (osrmData.code !== 'Ok' || !osrmData.routes?.length) {
            return res.status(404).json({
                data: undefined,
                code: 'API_ROUTE_NOT_FOUND',
                message: 'No route could be found between these two points',
                success: false
            });
        }

        const route = osrmData.routes[0];

        const result: routeResultType = {
            distanceMeters: route.distance,
            durationSeconds: route.duration,
            // OSRM/GeoJSON gives [lng, lat] pairs — flipped here.
            geometry: (route.geometry.coordinates as [number, number][]).map(
                ([longitude, latitude]) => ({ latitude, longitude })
            )
        };

        return res.json({
            data: result,
            message: 'Route fetched successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};
