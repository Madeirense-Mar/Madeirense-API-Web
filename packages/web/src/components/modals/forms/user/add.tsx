import {
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import {
    PHONE_CODES,
    USER_ROLES,
    getLabel,
    parsePhoneNumber,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";

import { selectPhoneCode } from "components/utilities/DOM";

import Button from "components/buttons";
import Icon from "components/icon";

import type {
    $Enums
} from "@Madeirense/database/browser";

import type { IComponentState } from "components/interface";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    callback?: () => void;
};

const AddUserForm = ({
    callback,
    ...props
}: IPropTypes) => {
    const selectRef = useRef<HTMLSelectElement | null>(null);

    const { get, fetch } = useApp();
    const { eject } = useModal();

    const { users } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [form, updateForm] = useState<IComponentState<undefined>>({
        data: undefined,
        status: "idle",
        error: null
    });

    const {
        error,
        status
    } = form;


    async function POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const elements = $form.elements;

        try {
            updateForm(p => { return { ...p, status: "loading" } });

            await users.registerStaffMember({
                name: [
                    (elements.namedItem("fname") as HTMLInputElement).value as string,
                    (elements.namedItem("lname") as HTMLInputElement).value as string,
                ].join(' '),
                email: (elements.namedItem("email") as HTMLInputElement).value as string,
                email_marketing: false,
                phone: [
                    (elements.namedItem("code") as HTMLSelectElement).value as string,
                    parsePhoneNumber((elements.namedItem("phone") as HTMLInputElement).value as string)
                ].join(' '),
                profile_photo: "",
                user_role: (elements.namedItem("user_role") as HTMLSelectElement).value as $Enums.Users_user_role,
                restaurant_id: parseInt((elements.namedItem("restaurant_id") as HTMLSelectElement).value as string)
            });

            await fetch("Drivers");

            updateForm(p => { return { ...p, status: "idle" } });

            eject(callback);
        } catch (error) {
            updateForm(p => {
                return {
                    ...p,
                    status: "error",
                    error: new Error((error as Error).message)
                }
            });
        }
    };

    const restaurants = useMemo(() => (get("Restaurants") ?? []), [get]);

    return <form onSubmit={POST} className="h-ful w-full flex flex-col justify-start items-start gap-4 p-3" {...props}>
        <label htmlFor="restaurant_id" className="w-full text-left">
            <span>Restaurante</span>

            <br />

            <select title="Restaurante" id="restaurant_id" name="rgestaurant_id" defaultValue={""} className="w-full" required>
                <option hidden value="">Seleciona um restaurante</option>

                {restaurants.map(r => <option key={r.restaurant_id} value={r.restaurant_id}>
                    {r.name}
                </option>)}
            </select>
        </label>

        <fieldset className="w-full flex flex-row justify-start items-start gap-2">
            <label htmlFor="fname" className="w-full text-left">
                <span>Primeiro nome</span>

                <br />

                <input id="fname" type="text" name="fname" placeholder="Primeiro nome" className="w-full" required />
            </label>

            <label htmlFor="lname" className="w-full text-left">
                <span>Último Nome</span>

                <br />

                <input id="lname" type="text" name="lname" placeholder="Último nome" className="w-full" required />
            </label>
        </fieldset>

        <fieldset className="w-full flex flex-row justify-start items-start gap-2">
            <label htmlFor="email" className="w-full text-left">
                <span>E-mail</span>

                <br />

                <input id="email" type="email" name="email" placeholder="oteuemail@provedor.com" className="w-full" required />
            </label>

            <label htmlFor="user_role" className="w-full text-left">
                <span>Tipo</span>

                <br />

                <select title="Tipo de utilizador" id="user_role" name="user_role" defaultValue={""} className="w-full" required>
                    <option hidden value="">Seleciona um tipo</option>

                    {USER_ROLES.map(role => <option key={role} value={role}>
                        {getLabel(role)}
                    </option>)}
                </select>
            </label>
        </fieldset>

        <fieldset className="w-full flex flex-col justify-start items-start">
            <label htmlFor="phone" className="text-left">
                <span>Nº do telefone</span>
            </label>

            <div className="flex flex-row justify-start items-center w-full">
                <select ref={selectRef} title="Código do telefone" id="code" name="code" defaultValue={""} required>
                    <option hidden value="">Seleciona um código</option>

                    {PHONE_CODES.map(({ country, code }) => <option key={code} value={code}>
                        {`(${code}) ${country}`}
                    </option>)}
                </select>

                <input id="phone" type="tel" name="phone" onChange={selectPhoneCode(selectRef)} className="w-full" placeholder="Nº do telefone" pattern="^(\+?\d{1,4}\s?)?\d{6,15}$" required />
            </div>
        </fieldset>

        <div className="flex flex-col justify-start items-start w-full gap-2 mt-auto">
            {error && <p data-state="error" className="w-full flex flex-row justify-start items-center gap-4">
                <Icon name="ExclamationCircle" />

                {error.message}
            </p>}

            <Button type="submit" className="w-full" disabled={status === "loading"}>
                Criar utilizador

                {status === "loading" && <Icon name="Loading" className="animate-spin" />}
            </Button>
        </div>
    </form>
};

export default AddUserForm;