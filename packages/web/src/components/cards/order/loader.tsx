import {
    type ComponentProps
} from "react";

import { Link } from "react-router-dom";

import { resolveClassNames } from "@Madeirense/shared";

import Button from "components/buttons";
import Icon from "components/icon";
import Progress from "components/progressBar";
import Tag from "components/tag";

import styles from "./loader.module.css";

// ***************************************************************************************************************

interface IOrderCardProps extends ComponentProps<"div"> {
    mode?: "default" | "admin";
};

const OrderCardLoader = (_props: IOrderCardProps) => {
    const {
        className,
        mode = "default",
        ...props
    } = _props;

    return <div
        className={resolveClassNames(styles.loader, className)}
        {...props}
    >
        <div className="min-h-[32px] flex flex-row justify-start items-center gap-1 w-full overflow-y-hidden overflow-x-auto">
            <Link to="#" className="pointer-events-none animate-pulse">
                <Icon name="Link2" />

                <span className="opacity-0">loading...</span>
            </Link>

            <Tag>
                <span className="opacity-0">loading...</span>
            </Tag>

            {mode === "admin" && <Button
                className="ml-auto animate-pulse"
                variant="secondary"
                disabled
            >
                <span className="opacity-0">loading...</span>
            </Button>}
        </div>

        <Progress value={0} className="w-full animate-pulse" data-status="idle" />

        <div className="min-h-[32px] flex flex-row justify-start items-center gap-1 w-full overflow-y-hidden overflow-x-auto">
            {mode === "admin" && <Tag>
                <Icon name="User" />

                <span className="opacity-0">loading...</span>
            </Tag>}

            <Tag>
                <Icon name="CashRegister" />

                <span className="opacity-0">loading...</span>
            </Tag>

            <Tag className="ml-auto">
                <Icon name="Store" />

                <span className="opacity-0">loading...</span>
            </Tag>
        </div>

    </div>;
};

export default OrderCardLoader;