import {
    resolveClassNames
} from "@Madeirense/shared";

import styles from "./description.module.css";

import type {
    BaseLabelPropTypes
} from "./types";

// ***************************************************************************************************************

const DescriptionLabel = ({
    alerts,
    className,
    description,
    input,
    selectable = false,
    title,
    ...props
}: Omit<BaseLabelPropTypes, "icon">) => {
    const { 
        element, 
        icon,
        props: inputProps
    } = input;

    const Element = element as React.ElementType;

    return <label 
        className={resolveClassNames(styles.label, className)} 
        {...(selectable) ? { "data-variant": "selectable" } : {}}
        {...props}
    >
        <div>
            <span>
                {title}
            </span>

            <span>
                {description}
            </span>
        </div>

        <div>
            {icon}
            
            <Element {...inputProps} />
        </div>
    </label>
};

export default DescriptionLabel;