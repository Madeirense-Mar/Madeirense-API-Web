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
    const { 
        element, 
        props: inputProps
    } = input;

    const body = <div>
        {icon && <Icon name={icon} />}

        <span>
            {title}
        </span>
    </div>;

    const computedProps = {
        className: resolveClassNames(styles.label, className),
        ...(selectable) ? { "data-variant": "selectable" } : {},
        ...props
    };

    const Element = element as React.ElementType;

    switch (element) {
        case "select":
            return <label {...computedProps}>
                {body}

                <Element {...inputProps}>
                    {input.options.map(op => <option key={op.value.data} {...op.value.props}>
                        {op.key}
                    </option>)}
                </Element>
            </label>

        default:
            return <label {...computedProps}>
                {body}

                <Element {...inputProps} />
            </label>
    };
};

export default SimpleLabel;