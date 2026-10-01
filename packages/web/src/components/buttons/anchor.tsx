import {
    ComponentPropsWithoutRef,
    forwardRef
} from "react";

import { Link } from "react-router-dom";

import { resolveClassNames } from "@Madeirense/shared";

import styles from "./button.module.css";

import type {
    shapeType,
    sizeType,
    variantType
} from "components/types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentPropsWithoutRef<typeof Link> {
    shape?: shapeType,
    size?: sizeType,
    variant?: (
        | variantType
        | "tag"
        | "text"
        | "text-selected"
        | `receipt-${"primary" | "secondary"}`
    )
};

const AnchorButton = forwardRef<HTMLAnchorElement, IPropTypes>((props, ref) => {
    const {
        children = null,
        className,
        size = "m",
        shape = "rect",
        variant = "primary",
        type = "button",
        ...buttonProps
    } = props;

    return <Link
        className={resolveClassNames(
            styles[variant],
            styles[shape],
            styles[size],
            className
        )}
        {...{
            ref,
            type,
            ...buttonProps
        }}
    >
        {children}
    </Link>
});

export default AnchorButton;