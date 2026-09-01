import {
    useEffect,
    useRef,
    useState,
    type ComponentProps,
    type MouseEvent
} from "react";

import {
    resolveClassNames,
    type keyValuePair
} from "@Madeirense/shared";

import Button from "components/buttons";

import styles from "./slider.module.css";

// ***************************************************************************************************************

type valueType = (string | { value: string, icon: any });

interface IPropTypes extends ComponentProps<"div"> {
    defaultValue?: string;
    direction?: "horizontal" | "vertical";
    disabled?: boolean;
    list: keyValuePair<string, valueType>[];
    onPick?: (value: string) => void;
};

const SliderPicker = (_props: IPropTypes) => {
    const {
        className,
        defaultValue,
        direction = "horizontal",
        disabled,
        list,
        onPick,
        ...props
    } = _props;

    const $divRef = useRef<HTMLDivElement | null>(null);

    const [pickedValue, pickValue] = useState<valueType>(defaultValue ?? list[0].value);

    function handlePick({ target }: MouseEvent<HTMLButtonElement>) {
        pickValue((target as HTMLButtonElement).id);

        onPick?.((target as HTMLButtonElement).id)
    }

    useEffect(() => {
        if (!$divRef.current) return;

        let timeoutId: NodeJS.Timeout | null = null;

        const observer = new ResizeObserver((entries) => {
            if (timeoutId) clearTimeout(timeoutId);

            const $pickerEntry = entries[0] ?? null;

            if (!$pickerEntry) return;

            const $button = $pickerEntry.target.querySelector("button[data-selected='true']");

            if (!$button) return;

            timeoutId = setTimeout(() => $button.scrollIntoView({
                block: "center",
                behavior: "smooth",
                inline: "center"
            }), 30);
        });

        observer.observe($divRef.current);

        return () => {
            if (timeoutId) clearTimeout(timeoutId);

            observer.disconnect();
        }
    }, []);

    useEffect(() => {
        const $button = document.getElementById(typeof pickedValue === "string" ? pickedValue : pickedValue.value);

        if (!$button) return;

        $button.scrollIntoView({ block: "center", behavior: "smooth", inline: "center" })
    }, [pickedValue]);

    return <div
        className={resolveClassNames(styles.picker, styles[direction], className)}
        ref={$divRef}
        {...{
            ...(disabled ? { "data-state": "disbaled" } : {})
        }}
        {...props}
    >
        <div className="space"></div>

        {list.map(({ key, value }) => {
            const v = typeof value === "string" ? value : value.value;
            const pv = typeof pickedValue === "string" ? pickedValue : pickedValue.value;

            return <Button
                className={(pv === v) ? "opacity-100" : "opacity-30"}
                id={v}
                key={key}
                onClick={handlePick}
                variant={(pv === v) ? "selected" : "secondary"}
            >
                {typeof value === "string" ? null : value.icon}

                {key}
            </Button>
        })}

        <div className="space"></div>
    </div>
};

export default SliderPicker;