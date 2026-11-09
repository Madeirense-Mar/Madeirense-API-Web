import { 
    DB_MAX_VARCHAR_LENGTH
} from '@Madeirense/shared';

// ***************************************************************************************************************

export const API_MIN_CART_ITEMS_FOR_REMOVAL = 1; 
export const API_MAX_CART_ITEMS_FOR_REMOVAL = 100; 

/**
 * 5 hours in Milliseconds
 * @constant
 */
export const API_MAX_TIME_SESSION_TOKEN = 18000000; 
/**
 * 7 days and 168 hours in Milliseconds
 * @constant
*/
export const API_MAX_TIME_REFRESH_TOKEN = 604800000;

export const API_MAX_TEXT_REQUEST_LENGTH = DB_MAX_VARCHAR_LENGTH; 
export const API_MIN_TEXT_REQUEST_LENGTH = 10; 

export const API_MIN_ID_NUMBER = 1; 

export const API_MAX_RATING_NUMBER = 5; 
export const API_MIN_RATING_NUMBER = 1; 

export const API_PASSWORD_ENCRYPTION_ITERATOR = 1000;

export const REDIS_CACHE_PREFIX = "cache";