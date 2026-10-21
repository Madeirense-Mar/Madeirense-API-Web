import type { distanceVectorType } from "../types.js";

// ***************************************************************************************************************

/** Structured address, independent of the geocoding provider. Missing parts are empty strings. */
export type parsedAddressObjectType = {
    street_number: string,
    street_name: string,
    neighborhood: string,
    city: string,
    state: string,
    country: string,
    postal_code: string,
    address: string,
};

/** A search result: the structured address plus its position and a display name. */
export type geocodedPlaceType = parsedAddressObjectType & distanceVectorType & {
    /** Stable OpenStreetMap identifier (e.g. `N123456`), usable as a React key. */
    id: string,
    name: string,
    /** OSM tag value, e.g. `restaurant`, `residential`, `city`. */
    category: string,
};

/** `[minLongitude, minLatitude, maxLongitude, maxLatitude]` */
export type boundingBoxType = [number, number, number, number];

export type geocodingOptionsType = {
    /** Base URL of a Photon-compatible server. Defaults to {@link DEFAULT_GEOCODING_URL}. */
    baseURL?: string,
    signal?: AbortSignal,
};

export type geocodingSearchOptionsType = geocodingOptionsType & {
    /** Results near this point rank higher. */
    bias?: distanceVectorType,
    /** Results outside this box are excluded. */
    boundingBox?: boundingBoxType,
    limit?: number,
};

/**
 * Public Photon instance (komoot) — OpenStreetMap data, no key, built for
 * search-as-you-type. Fair use only; self-host Photon if volume grows.
 */
export const DEFAULT_GEOCODING_URL = "https://photon.komoot.io";

type photonPropertiesType = {
    osm_id?: number,
    osm_type?: string,
    osm_value?: string,
    name?: string,
    housenumber?: string,
    street?: string,
    district?: string,
    locality?: string,
    city?: string,
    county?: string,
    state?: string,
    country?: string,
    postcode?: string,
};

type photonFeatureType = {
    geometry: { coordinates: [number, number] }, // GeoJSON order: [lng, lat]
    properties: photonPropertiesType,
};

type photonResponseType = {
    features?: photonFeatureType[],
};

async function requestPhoton(
    path: string,
    params: Record<string, string | number | undefined>,
    { baseURL = DEFAULT_GEOCODING_URL, signal }: Readonly<geocodingOptionsType>
): Promise<photonFeatureType[]> {
    const url = new URL(path, `${baseURL.replace(/\/+$/, "")}/`);

    for (const [key, value] of Object.entries(params))
        if (value !== undefined) url.searchParams.set(key, String(value));

    const response = await fetch(url, { signal });

    if (!response.ok) throw new Error(`Geocoding error: ${response.status}`);

    const data = await response.json() as photonResponseType;

    return data.features ?? [];
}

function toParsedAddress(properties: Readonly<photonPropertiesType>): parsedAddressObjectType {
    const {
        name,
        housenumber = "",
        street = "",
        district,
        locality,
        city,
        county,
        state = "",
        country = "",
        postcode = ""
    } = properties;

    const neighborhood = district ?? locality ?? "";
    const resolvedCity = city ?? county ?? "";

    const streetLine = [street, housenumber].filter(Boolean).join(" ");

    // Ordered from most to least specific; duplicates (e.g. city "Luanda", state "Luanda") are dropped.
    const parts = [
        (name && name !== street) ? name : "",
        streetLine,
        neighborhood,
        resolvedCity,
        state
    ].filter(Boolean);

    return {
        street_number: housenumber,
        street_name: street,
        neighborhood,
        city: resolvedCity,
        state,
        country,
        postal_code: postcode,
        address: [...new Set(parts)].join(", ")
    };
}

function toGeocodedPlace({ geometry, properties }: Readonly<photonFeatureType>): geocodedPlaceType {
    const [longitude, latitude] = geometry.coordinates;

    const address = toParsedAddress(properties);

    return {
        ...address,
        id: `${(properties.osm_type ?? "X")}${properties.osm_id ?? `${latitude},${longitude}`}`,
        name: properties.name ?? address.address,
        category: properties.osm_value ?? "",
        latitude,
        longitude
    };
}

/**
 * Free-text address/place search (autocomplete-friendly).
 * @returns matching places, best match first; empty when nothing matched.
 */
export async function searchAddresses(
    query: string,
    options: Readonly<geocodingSearchOptionsType> = {}
): Promise<geocodedPlaceType[]> {
    const {
        bias,
        boundingBox,
        limit = 5,
        ...requestOptions
    } = options;

    const features = await requestPhoton("api/", {
        q: query.trim(),
        limit,
        lat: bias?.latitude,
        lon: bias?.longitude,
        bbox: boundingBox?.join(",")
    }, requestOptions);

    return features.map(toGeocodedPlace);
}

/**
 * Reverse geocoding: the nearest known address to a point.
 * @returns the parsed address, or `null` when nothing is known near the point.
 */
export async function getAddressFromCoordinates(
    { latitude, longitude }: Readonly<distanceVectorType>,
    options: Readonly<geocodingOptionsType> = {}
): Promise<parsedAddressObjectType | null> {
    const [feature] = await requestPhoton("reverse", {
        lat: latitude,
        lon: longitude,
        limit: 1
    }, options);

    return feature ? toParsedAddress(feature.properties) : null;
}
