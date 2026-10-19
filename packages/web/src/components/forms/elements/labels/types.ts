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
    ) & {
        icon?: any
    };
    selectable?: boolean;
};