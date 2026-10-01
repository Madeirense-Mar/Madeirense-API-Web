import {
    type ComponentPropsWithoutRef
} from "react";

import {
    resolveClassNames
} from "@Madeirense/shared";

import styles from "./tag.module.css";

import type {
    variantType
} from "../types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentPropsWithoutRef<"span"> {
    variant?: variantType;
};

const Tag = (_props: IPropTypes) => {
    const {
        children,
        className,
        variant = "primary",
        ...props
    } = _props;

    return <span className={resolveClassNames(styles[variant], className)} {...props}>
        {children}
    </span>;
};

export default Tag;