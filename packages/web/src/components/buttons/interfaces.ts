import { 
    type ComponentPropsWithRef 
} from "react";

import type {
    shapeType,
    sizeType,
    variantType
} from "components/types";

// ***************************************************************************************************************

export interface IButtonPropTypes extends ComponentPropsWithRef<"button"> {
    borderless?: boolean;
    shape?: shapeType;
    size?: sizeType,
    variant?: variantType;
};