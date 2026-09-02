import {
    type ComponentPropsWithoutRef
} from "react";

import { Link } from "react-router-dom";

import {
    resolveClassNames
} from "@Madeirense/shared";

import styles from "./tag.module.css";

import type {
    variantType
} from "../types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentPropsWithoutRef<typeof Link> {
    variant?: variantType;
};

const AnchorTag = (_props: IPropTypes) => {
    const {
        children,
        className,
        variant = "primary",
        ...props
    } = _props;

    return <Link className={resolveClassNames(styles[variant], className)} {...props}>
        {children}
    </Link>;
};

export default AnchorTag;