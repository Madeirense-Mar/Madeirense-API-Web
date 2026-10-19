import {
    resolveClassNames
} from "@Madeirense/shared";

import Icon from "components/icon";

import styles from "./simple.module.css";

import type { 
    BaseLabelPropTypes
} from "./types";

// ***************************************************************************************************************

const SimpleLabel = ({ 
    alerts,
    className,
    description,
    icon,
    input,
    selectable = false,
    title,
    ...props
}: BaseLabelPropTypes) => {
    const { element, props: inputProps } = input;
    
    const Element = element as React.ElementType;

    return <label 
        className={resolveClassNames(styles.label, className)} 
        {...(selectable) ? { "data-variant": "selectable" } : {}}
        {...props}
    >
        <div>
            {icon && <Icon name={icon} />}

            <span>
                {title}
            </span>
        </div>

        <Element {...inputProps} />
    </label>
};

export default SimpleLabel;