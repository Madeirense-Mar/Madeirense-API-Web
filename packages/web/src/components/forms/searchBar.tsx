import { type ComponentProps } from "react";

import { 
    resolveClassNames
} from "@Madeirense/shared";

import Icon from "components/icon";

import styles from "./searchBar.module.css";

export interface IPropTypes extends ComponentProps<"form"> {
    inputProps?: ComponentProps<"input">
}

export default function SearchBar({ className, inputProps, ...props }: IPropTypes) {
    return <form className={resolveClassNames(styles.form, className)} {...props}>
        <Icon name="Search" />

        <input {...inputProps} />
    </form>
};