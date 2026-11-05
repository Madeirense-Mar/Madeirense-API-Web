import {
    useMemo,
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import MXP$App from "configurations";

import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import ProfileHeaderCard from "components/cards/profileHeader";
import Icon from "components/icon";

import type {
    Users
} from "@Madeirense/database/browser";

import type { IComponentState } from "components/interface";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    callback?: () => void;
    user: Users;
};

const BlockUserForm = ({
    callback,
    user,
    ...props
}: IPropTypes) => {
    const { eject } = useModal();

    const { users } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [form, updateForm] = useState<IComponentState<undefined>>({
        data: undefined,
        status: "idle",
        error: null
    });

    const { error, status } = form;


    async function PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);

        updateForm(f => { return { ...f, status: "loading" } });

        try {
            const expires_at = $form_data.get("expires_at") as string;

            await users.block(
                user.user_id,
                {
                    reason: $form_data.get("reason") as string,
                    ...(expires_at === "" ? {} : { expires_at: new Date(expires_at) }),
                }
            );

            eject(callback);
        } catch (error) {
            updateForm(f => { return { ...f, status: "error", error: new Error((error as Error).message) } });
        }
    }

    return <form onSubmit={PATCH} className="w-full h-full flex flex-col justify-start items-start gap-3" {...props}>
        <ProfileHeaderCard {...{ user }} className="w-full" />

        <fieldset className="w-full flex flex-col justify-start items-start gap-4">
            <legend className="text-lg font-semibold">Motivo</legend>

            <label className="w-full flex flex-col justify-start items-start">
                <span className="text-base">
                    <Icon name="Notes" className="inline mr-2" />

                    Por que razão esta utilizador está a ser bloqueado?
                </span>

                <textarea
                    className="w-full mt-1 text-base font-normal"
                    name="reason"
                    title="Razão do bloqueio"
                    placeholder="..."
                    required
                />
            </label>

            <label className="w-full flex flex-col justify-start items-start">
                <span>
                    <Icon name="Time" className="inline mr-2" />

                    (Opcional) Por quanto tempo?
                </span>

                <span className="italic opacity-35 hover:opacity-100">
                    Se não preencher este campo, o bloqueio será por tempo indefinido (até ser desbloqueado manualmente)
                </span>

                <input
                    className="w-full mt-1"
                    type="date"
                    name="expires_at"
                    title="Data de expiro"
                    min={new Date().toISOString()}
                    placeholder={new Date().toISOString()}
                />
            </label>
        </fieldset>

        <div className="flex flex-col justify-start items-start w-full gap-2 mt-auto">
            {error && <p data-state="error" className="w-full flex flex-row justify-start items-center gap-4">
                <Icon name="ExclamationCircle" />

                {error.message}
            </p>}

            <Button type="submit" disabled={status === "loading"} className="w-full">
                Bloquear

                {status === "loading" && <Icon name="Loading" className="animate-spin" />}
            </Button>
        </div>
    </form>
};

export default BlockUserForm;