import env from 'env';
import { createClient } from 'redis';

const redisClient = createClient({
    keyPrefix: env.REDIS_KEY_PREFIX,
    url: env.REDIS_URL
});

redisClient.on('error', err => console.log('Redis Client Error', err));

export default redisClient;