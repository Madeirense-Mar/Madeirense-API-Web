import env from 'env';
import { createClient } from 'redis';

const redisClient = createClient({
    keyPrefix: env.REDIS_KEY_PREFIX,
    url: env.REDIS_URL
});

redisClient.on('connect', () => console.log('REDIS: Successfully connect'));
redisClient.on('error', err => console.log('REDIS: Client Error', err));

await redisClient.connect();

export default redisClient;