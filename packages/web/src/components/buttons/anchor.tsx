import {
    forwardRef,
    type ComponentPropsWithoutRef
} from "react";

import {
    Link
} from "react-router-dom";

import {
    resolveClassNames
} from "@Madeirense/shared";

import styles from "./button.module.css";

import type {
    shapeType,
    sizeType,
    variantType
} from "components/types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentPropsWithoutRef<typeof Link> {
    borderless?: boolean;
    shape?: shapeType;
    size?: sizeType;
    variant?: (
        | variantType
        | "tag"
        | `text${"" | "-selected"}`
        | `receipt-${"primary" | "secondary"}`
    );
};

const AnchorButton = forwardRef<HTMLAnchorElement, IPropTypes>(({
    borderless = false,
    children = null,
    className,
    size = "m",
    shape = "rect",
    variant = "primary",
    type = "button",
    ...props
}, ref) => {
    const _className = resolveClassNames(
        styles[variant],
        styles[shape],
        styles[size],
        borderless ? styles.borderless : undefined,
        className
    );

    return <Link className={_className} {...{ ref, type, ...props }}>
        {children}
    </Link>
});

export default AnchorButton;