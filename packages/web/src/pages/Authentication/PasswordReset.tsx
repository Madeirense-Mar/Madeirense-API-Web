//#region Imports -----------------------------------------
import {
    useEffect,
    useState
} from "react";

import {
    useNavigate,
    useSearchParams
} from "react-router-dom";

import {
    Madeirense$Enumerators,
    testString
} from "@Madeirense/shared";

import type {
    Users
} from "@Madeirense/database";

import MXP$App from "configurations";

import Button from "components/buttons";
import Icon from "components/icon";

import { Root$Enumerators } from "styles/enumerators";

import styles from "./PasswordReset.module.css";
//#endregion

// ***************************************************************************************************************

//#region Variables ---------------------------------------
const {
    authentication: authenticationAPI
} = MXP$App.Base.Business.endpoints;
//#endregion

function PasswordResetPage() {
    //#region Hook and state declarations -----------------
    const navigate = useNavigate();

    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [error, setError] = useState<Error | null>(null);
    const [password, setPassword] = useState<string>("");
    const [registering, setRegistering] = useState(false);
    const [user, setUser] = useState<Users | null>(null);

    const [searchParams] = useSearchParams();

    const token = searchParams.get(Madeirense$Enumerators.SearchQueries.token);
    //#endregion

    //#region Variable declarations -----------------------
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

    const arePasswordsValid = [
        validations["password"].every(({ validation }) => validation),
        validations["confirmPassword"].every(({ validation }) => validation)
    ].includes(true);

    const assertions = {
        arePasswordsValid,

        "isFormDisabled": [
            registering,
            !user
        ].includes(true),

        "isSubmitDisabled": [
            !arePasswordsValid,
            registering
        ].includes(true)
    };
    //#endregion

    //#region Functions -----------------------------------
    async function POST(e: any) {
        e.preventDefault();

        if (!token)
            return null;

        const $formData = new FormData(e.target as HTMLFormElement);

        setError(null);
        setRegistering(true);

        try {
            await authenticationAPI.setCredentials( $formData.get("password") as string, token);
        } catch (error) {
            setError(new Error((error as Error).message));

            setRegistering(false);
        }
    };
    //#endregion

    //#region Effects -------------------------------------
    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages.authentication
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    useEffect(() => {
        if (!token || user !== null)
            return;

        authenticationAPI.validateResetToken({ token })
            .then(setUser)
            .catch(error => {

            });
    }, [token, user]);
    //#endregion

    //#region DOM -----------------------------------------
    switch (true) {
        case (token === null):
            navigate(Madeirense$Enumerators.Pages.App.Layout, { replace: true });

            return null;

        default:
            return <main className={styles.main}>
                <header>
                    <h1>Repor palavra-passe</h1>
                </header>

                <section>
                    <form onSubmit={POST}>
                        <fieldset className="flex flex-col justify-start items-start w-full gap-3">
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

                        <Button type="submit" disabled={assertions.isSubmitDisabled} className="mt-5 w-full" variant="primary">
                            {registering ? <Icon name="Loading" className="animate-spin" /> : "Registar"}
                        </Button>
                    </form>
                </section>
            </main>
    };
    //#endregion
};

export default PasswordResetPage;