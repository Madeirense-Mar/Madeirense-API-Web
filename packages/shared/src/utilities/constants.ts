import type {
    $Enums
} from "@Madeirense/database/browser";

import type { 
    appCachedDataType, 
    appPreferencesType,
    dateIntervalsType
} from "../types.js";

import type { API$Types } from "../services/types.js";

import type { cartSummaryType } from "../types/cart.js";
import type { applicationSettingsType } from "../types/globalSettings.js";

// ***************************************************************************************************************

export const ELIGIBLE_PAYMENT_TYPES = [
    "Debit_Card",
    "Multicaixa_Express"
] as ReadonlyArray<$Enums.Payments_payment_method>;

export const ACCEPTED_PAYMENT_TYPES = [
    ...ELIGIBLE_PAYMENT_TYPES,
    "Offer"
] as ReadonlyArray<$Enums.Payments_payment_method>;

export const ALLOWED_SPECIAL_CHARACTERS = '!@#$%^&*()-_=+[]{}|\\\\:;"\'<>,.?/~`´' as const;

export const APP_ACCEPTED_IMAGE_UPLOAD_MIMETYPES = [
    '.png',
    '.jfif',
    '.jpeg',
    '.jpg',
    '.webp'
];

export const APP_NOVELTY_PERIOD: Readonly<number> = 30;
export const APP_OPTIMISTIC_TIMEOUT_MS = 5000;
export const APP_TEMP_PROFILE_REFERENCE_LENGTH = 7;
export const APP_TTL_DEFAULT = 5000;
export const APP_TTL_DETRACTION_MS = 1000;

const AVG_KITCHEN_PREP_TIME_BUFFER = 10 as const;
const AVG_ORDERS = 20 as const;
const AVG_TIME = 20 as const;

export const DEFAULT_API_CLIENT_DEBUG_OPTIONS: Readonly<API$Types.debugOptions> = {
	logs: {
		error: false,
		response: false,
		url: false
	}
};

export const DEFAULT_API_LIST_LIMIT = 10 as const;

export const DEFAULT_APP_PREFERENCES: Readonly<appPreferencesType> = {
    location: "default",
    notifications: "default",
    paymentMethod: null
};

export const DEFAULT_APP_CACHED_DATA: Readonly<appCachedDataType> = {
    hasCredentials: false
};

export const DEFAULT_APP_SETTINGS: Readonly<applicationSettingsType> = {
    setting_id: 0,
    auto_assign_driver: false,
    order_threshold: AVG_ORDERS,
    avg_ttd: AVG_TIME,
    avg_ttp: AVG_TIME,
    prep_buffer: AVG_KITCHEN_PREP_TIME_BUFFER,
    Global_Settings_Eligible_Payment_Types: ELIGIBLE_PAYMENT_TYPES.map(payment_method => ({ payment_method })),
    change_version: "default-unloaded-shared-version"
};

export const DEFAULT_DEBOUNCE_MS: Readonly<number> = 500;

export const DEFAULT_SUMMARY: Readonly<cartSummaryType> = {
    totalItems: 0,
    originalPrice: 0,
    totalDiscount: 0,
    totalPrice: 0
};

export const DOCUMENT_TITLE_PREFIX: Readonly<string> = "MADEIRENSE |";

export const DATE_INTERVALS = ["daily", "monthly", "yearly"] as ReadonlyArray<dateIntervalsType>;

export const DAYS_OF_THE_WEEK = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
] as ReadonlyArray<$Enums.Restaurant_Hours_day_of_week>;

export const DAYS_OF_THE_MONTH = [
    31,
    28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
] as ReadonlyArray<number>;

export const DB_MAX_VARCHAR_LENGTH = 255 as const;

export const ERROR_MESSAGE_SEPARATOR: Readonly<string> = "$$$";

export const MAX_VIEWPORT_WIDTH: Readonly<number> = 1130;
export const MIN_VIEWPORT_WIDTH: Readonly<number> = 768;

export const MENU_PRODUCT_TYPES = [
    "beverage",
    "dessert",
    "main",
    "starter"
] as ReadonlyArray<$Enums.Products_product_type>;

export const MENU_PRODUCT_COMPOSITIONS = [
    "alcoholic",
    "fish",
    "meat",
    "merchandise",
    "mixed",
    "non_alcoholic",
    "vegan",
    "wheat"
] as ReadonlyArray<$Enums.Products_product_composition>;

export const ORDERS_FINISHED_STATUS = [
    "cancelled",
    "delivered"
] as ReadonlyArray<$Enums.Orders_status>;

export const ORDERS_HISTORY_STATUS = [
    "assigned",
    "cancelled",
    "confirmed",
    "delivered",
    "pending",
    "preparing",
    "ready",
] as ReadonlyArray<$Enums.Order_History_status>;

export const ORDERS_PREPARATION_STATUS = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "assigned",
] as ReadonlyArray<$Enums.Orders_status>;

export const ORDERS_STATUS = [
    "assigned",
    "cancelled",
    "confirmed",
    "delivered",
    "pending",
    "preparing",
    "ready",
] as ReadonlyArray<$Enums.Orders_status>;

export const PAYMENT_TYPES = [
    "Bank_Transfer",
    "Cash",
    "Credit_Card",
    "Debit_Card",
    "Multicaixa_Express",
    "PayPal",
    "Payment_Reference"
] as ReadonlyArray<$Enums.Payments_payment_method>;

export const PHONE_CODES = [
    { country: "Algeria", code: "+213" },
    { country: "Angola", code: "+244" },
    { country: "Austria", code: "+43" },
    { country: "Belgium", code: "+32" },
    { country: "Botswana", code: "+267" },
    { country: "Cameroon", code: "+237" },
    { country: "Côte d'Ivoire", code: "+225" },
    { country: "Croatia", code: "+385" },
    { country: "Denmark", code: "+45" },
    { country: "Egypt", code: "+20" },
    { country: "Ethiopia", code: "+251" },
    { country: "Finland", code: "+358" },
    { country: "France", code: "+33" },
    { country: "Germany", code: "+49" },
    { country: "Ghana", code: "+233" },
    { country: "Greece", code: "+30" },
    { country: "Ireland", code: "+353" },
    { country: "Italy", code: "+39" },
    { country: "Kenya", code: "+254" },
    { country: "Morocco", code: "+212" },
    { country: "Namibia", code: "+264" },
    { country: "Netherlands", code: "+31" },
    { country: "Nigeria", code: "+234" },
    { country: "Norway", code: "+47" },
    { country: "Poland", code: "+48" },
    { country: "Portugal", code: "+351" },
    { country: "Romania", code: "+40" },
    { country: "Russia", code: "+7" },
    { country: "Senegal", code: "+221" },
    { country: "South Africa", code: "+27" },
    { country: "Spain", code: "+34" },
    { country: "Sweden", code: "+46" },
    { country: "Switzerland", code: "+41" },
    { country: "Tanzania", code: "+255" },
    { country: "Tunisia", code: "+216" },
    { country: "Uganda", code: "+256" },
    { country: "Ukraine", code: "+380" },
    { country: "United Kingdom", code: "+44" },
    { country: "United States", code: "+1" },
    { country: "Zambia", code: "+260" },
    { country: "Zimbabwe", code: "+263" }
];

type RangeType = "password-length";
type RangeValueType = Record<"min" | "max", number>;

export const RANGES: Readonly<Record<RangeType, RangeValueType>> = {
    "password-length": { min: 6, max: 100 }
};

export const REALLOCATION_MOTIVES_THAT_REQUIRE_REASON = [
    "TARDINESS",
    "UNAVAILABLE"
] as ReadonlyArray<$Enums.Courier_Reallocation_Requests_motive>;

export const RESTAURANT_USER_ROLES = [
    "Admin",
    "Driver",
    "Staff",
] as ReadonlyArray<$Enums.Users_user_role>;

export const USER_ROLES = [
    "Admin",
    "Customer",
    "Driver",
    "Staff"
] as ReadonlyArray<$Enums.Users_user_role>;