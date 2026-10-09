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
import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./slider.module.css";

// ***************************************************************************************************************

type valueType = (string | { value: string, icon: any });

interface IPropTypes extends ComponentProps<"div"> {
    defaultValue?: string;
    direction?: "horizontal" | "vertical";
    disabled?: boolean;
    element?: 'Button' | 'Tag';
    list: keyValuePair<string, valueType>[];
    multiple?: boolean;
    onPick?: (value: string) => void;
    onMultiplePick?: (values: string[]) => void;
};

const SliderPicker = (_props: IPropTypes) => {
    const {
        className,
        defaultValue,
        direction = "horizontal",
        disabled,
        element = 'Button',
        list,
        multiple = false,
        onPick,
        onMultiplePick,
        ...props
    } = _props;

    const $divRef = useRef<HTMLDivElement | null>(null);

    const [pickedValue, pickValue] = useState<valueType>(defaultValue ?? list[0].value);
    const [pickedValues, setPickedValues] = useState<string[]>([]);

    const assertions = {
        "isClearElementDisabled": [
            pickedValues.length === 0
        ].includes(true)
    };

    function handlePick({ target }: MouseEvent<HTMLButtonElement>) {
        switch (multiple) {
            case true:
                const value = (target as HTMLButtonElement).id;

                const _pickedValues = pickedValues.includes(value)
                    ? pickedValues.filter(v => v !== value)
                    : [...pickedValues, value];

                setPickedValues(_pickedValues);

                onMultiplePick?.(_pickedValues);
                break;

            default:
                pickValue((target as HTMLButtonElement).id);
                break;
        }

        onPick?.((target as HTMLButtonElement).id);
    }

    function clearPickedValues() {
        setPickedValues([]);

        onMultiplePick?.([]);
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

    const $clearElementProps = {
        onClick: clearPickedValues
    };

    const $clearElementChildren = <>
        <Icon name="Close" />

        Limpar
    </>;

    return <div
        className={resolveClassNames(styles.picker, styles[direction], className)}
        ref={$divRef}
        {...{
            ...(disabled ? { "data-state": "disbaled" } : {})
        }}
        {...props}
    >
        <div className="space"></div>

        {multiple && <>
            {(element === 'Button') && <Button {...$clearElementProps} disabled={assertions.isClearElementDisabled}>
                {$clearElementChildren}
            </Button>}

            {(element === 'Tag') && <Tag {...$clearElementProps} {...{ ...(assertions.isClearElementDisabled) ? { ["data-disabled"]: "" } : {} }}>
                {$clearElementChildren}
            </Tag>}
        </>}

        {list.map(({ key, value }) => {
            const v = typeof value === "string" ? value : value.value;
            const pv = (multiple) ? null : typeof pickedValue === "string" ? pickedValue : pickedValue.value;
            const variant = ((multiple) ? pickedValues.includes(v) : (pv === v)) ? "selected" : "secondary";

            const props = {
                id: v,
                key,
                onClick: handlePick
            };

            switch (element) {
                case 'Button':
                    return <Button {...props} {...{ variant }}>{typeof value === "string" ? null : value.icon} {key}</Button>;

                case 'Tag':
                    return <Tag {...props} {...{ variant }}>{typeof value === "string" ? null : value.icon} {key}</Tag>;

                default:
                    throw new Error(`In SliderPicker, unknown element: ${element}`);
            }
        })}

        <div className="space"></div>
    </div>
};

export default SliderPicker;