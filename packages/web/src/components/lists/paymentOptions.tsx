import {
    ChangeEvent,
    useEffect,
    useMemo,
    type ComponentProps,
    type MouseEvent
} from "react";

import {
    DEFAULT_APP_PREFERENCES,
    DEFAULT_APP_SETTINGS,
    PAYMENT_TYPES,
    resolveClassNames,
    type appPreferencesType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";

import Icon, { 
    type iconNameType
} from "components/icon";

import styles from "./paymentOptions.module.css";

import type { 
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"ul"> {
    disabledItems?: $Enums.Payments_payment_method[];
    disconsiderPreferredMethod?: boolean;
    hiddenItems?: $Enums.Payments_payment_method[];
    mode: "default" | "eligible";
    required?: boolean;
    selectable?: boolean;
    selectedItems?: $Enums.Payments_payment_method[];
    selectionMode?: selectionModeType;
    onItemSelect?: (event: ChangeEvent<HTMLInputElement>) => void;
};

type selectionModeType = "checkbox" | "radio";

enum Labels {
    "Bank_Transfer" = "Transferência bancária",
    "Cash" = "Dinheiro (em mão)",
    "Credit_Card" = "Cartão de crédito (VISA/Mastercard)",
    "Debit_Card" = "TPA (Cartão de débito)",
    "Multicaixa_Express" = "Multicaixa Express",
    "PayPal" = "PayPal",
    "Payment_Reference" = "Pagamento por referência",
    "Offer" = "Oferta (Grátis)"
};

function PaymentTypesList(_props: IPropTypes) {
    const {
        className,
        disabledItems = [],
        disconsiderPreferredMethod = false,
        hiddenItems = [],
        mode = "default",
        onItemSelect,
        required = false,
        selectable,
        selectedItems = [],
        selectionMode = "radio",
        ...props
    } = _props;
    const { get } = useApp();

    const { Storage } = MXP$App;

    const { 
        Global_Settings_Eligible_Payment_Types
    } = get("Global_Settings") ?? DEFAULT_APP_SETTINGS;

    const eligiblePaymentTypes = useMemo(() => Global_Settings_Eligible_Payment_Types.map(({ payment_method }) => payment_method), [Global_Settings_Eligible_Payment_Types]);

    function getIcon(type: $Enums.Payments_payment_method) {
        let name: iconNameType;

        switch (type) {
            case "Bank_Transfer": name = "MoneyTransfer"; break;
            case "Cash": name = "TakeMyMoney"; break;
            case "Credit_Card": name = "CreditCard"; break;
            case "Debit_Card": name = "SwipeCard"; break;
            case "Multicaixa_Express": name = "MobileOTP"; break;
            case "PayPal": name = "Paypal"; break;
            case "Payment_Reference": name = "Password"; break;
            case "Offer": name = "Gift"; break;

            default: return null;
        };

        return <Icon {...{ name }} />
    };

    const types: Record<IPropTypes["mode"], ReadonlyArray<$Enums.Payments_payment_method>> = {
        "default": PAYMENT_TYPES,
        "eligible": eligiblePaymentTypes
    };

    async function setAsPreferred({ target: $input }: MouseEvent<HTMLInputElement>) {
        const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

        Storage.setItem<appPreferencesType>(
            "L_APP$PREFERENCES",
            { ...preferences, paymentMethod: ($input as HTMLInputElement).value as $Enums.Payments_payment_method }
        );
    };

    useEffect(() => {
        if ([
            disconsiderPreferredMethod,
            !selectable,
            selectionMode !== "radio",
            selectedItems.length > 0,
        ].includes(true)) return;

        async function selectPreferredMethod() {
            const { paymentMethod } = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (!paymentMethod) return;

            const $input = document.getElementById(paymentMethod) as HTMLInputElement;

            if (!$input) return;

            $input.checked = true;
        };

        selectPreferredMethod();
    }, [Storage, disconsiderPreferredMethod, selectable, selectedItems, selectionMode]);

    return <ul className={resolveClassNames(styles.list, className)} {...props}>
        {types[mode].filter(type => !hiddenItems.includes(type)).map(type => <li key={type} data-state={disabledItems.includes(type) ? "disabled" : "idle"}>
            {selectable
                ? <label htmlFor={type} data-variant="selectable">
                    <input
                        id={type}
                        disabled={disabledItems.includes(type)}
                        defaultChecked={disabledItems.includes(type) ? false : selectedItems.includes(type)}
                        name="payment_method"
                        readOnly={disabledItems.includes(type)}
                        required={disabledItems.includes(type) ? false : required}
                        title={type}
                        type={selectionMode}
                        value={type}
                        onClick={(selectionMode === "checkbox" || disconsiderPreferredMethod) ? undefined : setAsPreferred}
                        onChange={onItemSelect}
                    />

                    {getIcon(type)}

                    <span>
                        {Labels[type]}
                    </span>
                </label>

                : <>
                    {getIcon(type)}

                    <span>
                        {Labels[type]}
                    </span>
                </>
            }
        </li>)}
    </ul>;
};

export default PaymentTypesList;