import redisClient from "lib/redis";

import type { API$Types } from "@Madeirense/shared";

// ***************************************************************************************************************

//TODO: Improve and use this function
export async function getCachedResponse<Data>(cacheKey: string): Promise<Partial<API$Types.response<Data>>> {
    const storedValue = await redisClient.json.get(cacheKey) as string | null;

    if (!storedValue)
        throw new Error(`(${cacheKey}) value is null`);

    const parsed = JSON.parse(storedValue) as {
        data: Data,
        pagination?: API$Types.paginationDescription
    };

    return {
        ...parsed,
        success: true
    };
};