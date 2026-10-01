import {
    forwardRef
} from 'react';

import { resolveClassNames } from '@Madeirense/shared';

import styles from "./button.module.css";

import type { variantType } from 'components/types';

import type { IButtonPropTypes } from './interfaces';

// ***************************************************************************************************************

type MutatedInterface = (Omit<IButtonPropTypes, ("variant")> & {
    variant?: (
        | variantType 
        | "tag"
        | "text"
        | "text-selected"
        | `receipt-${"primary" | "secondary"}`
    )
});

interface IPropTypes extends MutatedInterface { };

const Button = forwardRef<HTMLButtonElement, IPropTypes>((props, ref) => {
    const {
        children = null,
        className,
        size = "m",
        shape = "rect",
        variant = "primary",
        type = "button",
        ...buttonProps
    } = props;

    return <button
        className={resolveClassNames(
            styles[variant],
            styles[size],
            styles[shape],
            className
        )}
        {...{
            ref,
            type,
            ...buttonProps
        }}
    >
        {children}
    </button>
});

export default Button;