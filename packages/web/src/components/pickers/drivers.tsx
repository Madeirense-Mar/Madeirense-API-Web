import {
    useMemo,
    useState,
    type ComponentProps
} from "react";

import { resolveClassNames } from "@Madeirense/shared";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./drivers.module.css";

// ***************************************************************************************************************

interface IDriversPickerProps extends ComponentProps<"ul"> {
    mode?: ("checkbox" | "radio");
    restaurant_id?: number;
    required?: boolean;
};

function DriversPicker(_props: IDriversPickerProps) {
    const { 
        className,
        mode = "radio", 
        required = false, 
        restaurant_id, 
        ...props
    } = _props;

    const { 
        get,
        state
    } = useApp();

    const [search, setSearch] = useState("");

    const assertions = {
        "isLoading": [
            "fetching-Drivers", 
            "updating-Drivers"
        ].includes(state)
    };

    const drivers = useMemo(() => (get("Drivers") ?? [])
        .filter(d => search === "" ? true : [d.name, d.email, d.phone].some(s => s.toLowerCase().includes(search.toLowerCase().trim())))
        .filter(d => !restaurant_id ? true : d.Workstations[0].restaurant_id === restaurant_id),
        [get, search, restaurant_id]
    );

    function clearSearch() {
        setSearch("");

        const $input = document.querySelector(`input[name="search_couriers"]`) as HTMLInputElement;

        if (!$input) return;

        $input.value = "";
        $input.focus();
    };

    return <ul className={resolveClassNames(styles.picker, className)} {...props}>
        <li className="mb-3 w-full flex flex-row justify-start items-center gap-2">
            <Icon name="Delivery" />

            <span className="italic font-bold">Escolha o estafeta para a entrega do pedido:</span>
        </li>

        <li className="w-full flex flex-row justify-center items-center">
            <Icon name="Search" className="mr-2" />

            <input className="w-full" type="text" name="search_couriers" title="Pesquisar por: nome, telefone, ou e-mail" placeholder="nome, telefone, ou e-mail..." onChange={(e) => setSearch(e.target.value)} />

            <Button variant="secondary" title="Limpar campo" onClick={clearSearch} disabled={search === ""}>
                <Icon name="Close" />
            </Button>
        </li>

        {!Boolean(drivers.length) && <li className="p-3 w-full flex flex-col justify-start items-center gap-2">
            {(search !== "")
                ? <div className="flex flex-row justify-start items-center gap-2">
                    <span className="italic opacity-40">Nenhum estafeta corresponde à chave:</span>

                    <Tag>{search}</Tag>
                </div>

                : assertions.isLoading ? null : <span className="italic opacity-40">Não tem estafetas disponíveis de momento</span>
            }
        </li>}

        {(assertions.isLoading)
            ? <li className="p-3 w-full flex flex-col justify-start items-center gap-2">
                <Icon name="Loading" className="animate-spin" />
            </li>

            : drivers.map(driver => <li
                key={driver.user_id}
                className="w-full"
            >
                <label className="flex flex-row justify-start items-center gap-2 w-full">
                    <input type={mode} name="courier_id" value={driver.user_id} title={`Estafeta: ${driver.name}`} {...{ required }} />

                    <span className="mr-auto">{driver.name}</span>

                    <span className="flex flex-row justify-start items-center gap-2">
                        <Icon name="Email" />

                        {driver.email}
                    </span>

                    <span className="flex flex-row justify-start items-center gap-2">
                        <Icon name="Phone" />

                        {driver.phone}
                    </span>
                </label>
            </li>)
        }
    </ul>
};

export default DriversPicker;