import {
    forwardRef
} from 'react';

import {
    resolveClassNames
} from '@Madeirense/shared';

import styles from "./button.module.css";

import type {
    variantType
} from 'components/types';

import type {
    IButtonPropTypes
} from './interfaces';

// ***************************************************************************************************************

type MutatedInterface = (Omit<IButtonPropTypes, ("variant")> & {
    variant?: (
        | variantType
        | "tag"
        | `text${"" | "-selected"}`
        | `receipt-${"primary" | "secondary"}`
    )
});

interface IPropTypes extends MutatedInterface { };

const Button = forwardRef<HTMLButtonElement, IPropTypes>(({
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
        styles[size],
        styles[shape],
        borderless ? styles.borderless : undefined,
        className
    );
    
    return <button className={_className} {...{ ref, type, ...props }}>
        {children}
    </button>
});

export default Button;