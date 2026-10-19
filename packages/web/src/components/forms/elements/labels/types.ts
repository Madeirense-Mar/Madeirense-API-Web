import type {
    ComponentProps
} from "react";

import type { iconNameType } from "components/icon";

// ***************************************************************************************************************

export interface BaseLabelPropTypes extends ComponentProps<"label"> {
    alerts?: Partial<Record<("error" | "warning"), string>>;
    description: any;
    icon?: iconNameType;
    input: (
        | { element: 'input', props?: ComponentProps<"input"> }
        | { element: 'select', props?: ComponentProps<"select"> }
        | { element: 'textarea', props?: ComponentProps<"textarea"> }
    ) & {
        icon?: any
    };
    selectable?: boolean;
};