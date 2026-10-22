import {
    resolveClassNames
} from "@Madeirense/shared";

import Tag from "components/tags";
import Icon from "components/icon";

import styles from "./description.module.css";

import type {
    BaseLabelPropTypes
} from "./types";

// ***************************************************************************************************************

enum LabelLayouts {
    column = "column",
    row = "row"
};

interface IPropTypes extends BaseLabelPropTypes {
    layout?: keyof typeof LabelLayouts;
};

const DescriptionLabel = ({
    alerts,
    className,
    description,
    input,
    layout = LabelLayouts.row,
    selectable = false,
    title,
    icon,
    ...props
}: IPropTypes) => {
    const {
        element,
        icon: inputIcon,
        iconElement: inputIconElement,
        props: inputProps
    } = input;

    const body = <>
        <div>
            <span className={resolveClassNames(icon ? "inline-flex gap-2 justify-center items-center" : "")}>
                {icon && <Icon name={icon} />}

                {title}
            </span>

            <span>
                {description}
            </span>

            {alerts?.error && <Tag variant="danger">
                <Icon name="Close" />
                
                {alerts?.error}
            </Tag>}

            {alerts?.warning && <Tag variant="warning">
                <Icon name="Warning" />

                {alerts?.warning}
            </Tag>}
        </div>
    </>;

    const computedProps = {
        className: resolveClassNames(styles.label, styles[layout], className),
        ...(selectable) ? { "data-variant": "selectable" } : {},
        ...props
    };

    const Element = element as React.ElementType;

    switch (element) {
        case "select":
            return <label {...computedProps}>
                {body}

                <div>
                    {inputIcon && <Icon name={inputIcon} />}
                    {inputIconElement}

                    <Element {...inputProps}>
                        {input.options.map(op => <option key={op.value.data} value={op.value.data} {...op.value.props}>
                            {op.key}
                        </option>)}
                    </Element>
                </div>
            </label>

        default:
            return <label {...computedProps}>
                {body}

                <div>
                    {inputIcon && <Icon name={inputIcon} />}
                    {inputIconElement}

                    <Element {...inputProps} />
                </div>
            </label>
    }
};

export default DescriptionLabel;