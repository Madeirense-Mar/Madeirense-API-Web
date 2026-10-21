import type { 
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

export type atLeastOne<T> = (
    | T
    | [T, ...T[]]
);

export type appPreferencesType = {
    location: featurePermissionType,
    notifications: featurePermissionType,
    paymentMethod: $Enums.Payments_payment_method | null
};

export type appCachedDataType = {
    hasCredentials: boolean,
};

export type dateIntervalsType = (
    | "daily"
    | "monthly"
    | "yearly"
);

export type distanceVectorType = {
    latitude: number;
    longitude: number;
};

export type environmentType = ("development" | "production" | "staging" | "test");

type featurePermissionType = (
    |   "allowed" 
    |   "default" 
    |   "deferred"
    |   "denied" 
);

export type fixedLengthRecord<
    K extends string,
    V,
    N extends number
> = [K, ...K[]] extends { length: N } ? Record<K, V> : never;

export type keyValuePair<K extends (string | number | symbol), V = string> = {
    key: K,
    value: V
};

export type patternedPropertyTemplate<
    Pattern1 extends string,
    Pattern2 extends string,
> = `${Pattern1}${Pattern2}`;

export type tuple = [number, number];

export type valuePair<
    KeyPropertyName extends string = "key",
    ValuePropertyName extends string = "value"
> = Record<KeyPropertyName, ValuePropertyName>;

export type unionBetween<A, B> = A & B;

export type withEmptyString<String extends string> = String | "";