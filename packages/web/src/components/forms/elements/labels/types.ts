import Button from "components/buttons";

import type {
    ComponentProps
} from "react";

import type {
    keyValuePair
} from "@Madeirense/shared";

import type { iconNameType } from "components/icon";

// ***************************************************************************************************************

export interface BaseLabelPropTypes extends ComponentProps<"label"> {
    alerts?: Partial<Record<("error" | "warning"), string>>;
    description: any;
    icon?: iconNameType;
    input: (
        | { element: 'input', props?: ComponentProps<"input"> }
        | { element: 'select', props?: ComponentProps<"select">, options: keyValuePair<string, { data: (number | string), props?: ComponentProps<"option"> }>[] }
        | { element: 'textarea', props?: ComponentProps<"textarea"> }
        | { element: 'button', props?: ComponentProps<typeof Button>, label: React.JSX.Element }
    ) & {
        icon?: iconNameType;
        iconElement?: React.JSX.Element | null;
    };
    selectable?: boolean;
};