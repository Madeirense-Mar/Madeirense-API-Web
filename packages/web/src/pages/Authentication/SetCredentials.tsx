import {
    useEffect,
    useState
} from "react";

import {
    useNavigate,
    type NavigateOptions,
} from "react-router-dom";

import {
    useQuery
} from "@tanstack/react-query";

import {
    testString
} from "@Madeirense/shared";

import MXP$App from "configurations";

import AppSettings from "settings";

import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import Icon from "components/icon";

import { Root$Enumerators } from "styles/enumerators";

import "./SetCredentials.css";

// ***************************************************************************************************************

const PAGE_NAME = SetCredentialsPage.name;

function SetCredentialsPage() {
    const {
        Routing
    } = AppSettings;

    const {
        authentication
    } = MXP$App.Base.Business.endpoints;

    const navigate = useNavigate();

    const { user } = useProfile();

    const {
        data,
        isFetching,
        refetch
    } = useQuery({
        queryKey: [`${PAGE_NAME}$CheckCredentials`],
        queryFn: () => authentication.hasCredentials(),
        enabled: !!user
    });

    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [error, setError] = useState<Error | null>(null);
    const [password, setPassword] = useState<string>("");
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages["set-credentials"]
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    useEffect(() => {
        if ([undefined, false, null].includes(data) || !user) return;

        const options: NavigateOptions = { replace: true };

        navigate(Routing.redirectionMap[user.user_role], options);
    }, [
        data,
        navigate,
        user
    ]);

    async function POST(e: any) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);

        setError(null);
        setRegistering(true);

        try {
            await authentication.setCredentials($form_data.get("password") as string);

            await refetch();
        } catch (error) {
            setError(new Error((error as Error).message));

            setRegistering(false);
        }
    };

    const validations = {
        "password": [
            { label: "Deve conter pelo menos 1 número", validation: testString("With At least 1 number", password) },
            { label: "Deve conter pelo menos 1 carácter especial", validation: testString("With At least 1 special character", password) },
            { label: "Deve ter pelo menos 6 caracteres", validation: (password).length > 6 },
        ],
        "confirmPassword": [
            { label: "Passwords devem ser iguais", validation: ![confirmPassword, password].includes("") && (confirmPassword === password) },
        ]
    };

    const assertions = {
        "arePasswordsValid": (
            validations["password"].every(({ validation }) => validation) &&
            validations["confirmPassword"].every(({ validation }) => validation)
        )
    };

    switch (true) {
        case (data): { return <main></main> }

        case (isFetching): {
            return <main className="w-full h-full flex flex-col justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </main>
        }

        default: {
            return <main className="w-full h-full flex flex-col justify-center items-center">
                <form onSubmit={POST} className="m-auto">
                    <fieldset data-state={registering ? "disabled" : "idle"} className="flex flex-col justify-start items-start w-full gap-3">
                        <label htmlFor="password" className="font-bold">Password</label>

                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="Password"
                            onChange={({ target }) => setPassword(target.value)}
                            data-state={password === "" ? "idle" : validations["password"].every(({ validation }) => validation) ? "valid" : "error"}
                            required
                        />

                        <ul className="mb-2">
                            {validations["password"].map(({ label, validation }) => <li key={label} data-state={password === "" ? "idle" : validation ? "valid" : "error"}>
                                {`> ${label}`}
                            </li>)}
                        </ul>

                        <label htmlFor="password-2" className="font-bold">Confirmar password</label>

                        <input
                            id="password-2"
                            type="password"
                            name="password-2"
                            placeholder="Confirmar password"
                            onChange={({ target }) => setConfirmPassword(target.value)}
                            data-state={confirmPassword === "" ? "idle" : validations["confirmPassword"].every(({ validation }) => validation) ? "valid" : "error"}
                            required
                        />

                        <ul>
                            {validations["confirmPassword"].map(({ label, validation }) => <li key={label} data-state={confirmPassword === "" ? "idle" : validation ? "valid" : "error"}>
                                {`> ${label}`}
                            </li>)}
                        </ul>
                    </fieldset>

                    {error && <div data-state="error" className="w-full text-center p-1">
                        {error.message}
                    </div>}

                    <Button type="submit" disabled={!assertions.arePasswordsValid || registering} className="mt-5 w-full" variant="primary">
                        {registering ? <Icon name="Loading" className="animate-spin" /> : "Registar"}
                    </Button>
                </form>
            </main>
        }
    }
};

export default SetCredentialsPage;