import {
    useEffect,
    useRef,
    useState,
    type SubmitEvent,
} from "react";

import {
    Link,
    useNavigate,
    useParams,
    type NavigateOptions,
} from "react-router-dom";

import {
    PHONE_CODES,
    APIError,
    testString,
    parsePhoneNumber,
    resolveClassNames,
    Madeirense$Enumerators
} from "@Madeirense/shared";

import AppSettings from "settings";

import { selectPhoneCode } from "components/utilities/DOM";

import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import AnchorButton from "components/buttons/anchor";
import OAuthForm from "components/forms/oauth";
import Icon from "components/icon";

import { Page$Enumerators } from "./enumerators";
import { Root$Enumerators } from "styles/enumerators";

import styles from "./Welcome.module.css";

import "./Welcome.css";

// ***************************************************************************************************************

export namespace Welcome$Enumerators {
    export enum Forms {
        "login" = "login",
        "signup" = "signup",
        "forgot" = "forgot",
    };
};

type formType = keyof typeof Welcome$Enumerators.Forms;

function WelcomePage() {
    const {
        Routing
    } = AppSettings;

    const navigateOptions: NavigateOptions = { replace: true };

    const $selectRef = useRef<HTMLSelectElement | null>(null);

    const navigate = useNavigate();

    const {
        login,
        register,
        state
    } = useProfile();

    const params = useParams();

    const type = (params[Page$Enumerators.Parameters.type] || "login") as formType;

    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [error, setError] = useState<Error | null>(null);
    const [password, setPassword] = useState<string>("");

    function handleOAuthError(error: APIError<any>) {
        setError(new APIError(error));
    };

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages.welcome
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    const validations = {
        "password": [
            {
                label: "Deve conter pelo menos 1 número",
                validation: testString("With At least 1 number", password)
            },
            {
                label: "Deve conter pelo menos 1 carácter especial",
                validation: testString("With At least 1 special character", password)
            },
            {
                label: "Deve ter pelo menos 6 caracteres",
                validation: (password).length > 6
            },
        ],
        "confirmPassword": [
            {
                label: "Passwords devem ser iguais",
                validation: ![confirmPassword, password].includes("") && (confirmPassword === password)
            },
        ]
    };

    const assertions = {
        "arePasswordsValid": (type === "login") ? true : (
            validations["password"].every(({ validation }) => validation) &&
            validations["confirmPassword"].every(({ validation }) => validation)
        ),
        "isLoading": [
            "authentication",
            "loading",
            "logged",
            "registering"
        ].includes(state)
    };

    const $mainProps = {
        "className": resolveClassNames(styles.page, styles[type])
    };

    switch (type as formType) {
        case "forgot": {
            async function POST(e: SubmitEvent<HTMLFormElement>) {
                e.preventDefault();

                const $form = e.target as HTMLFormElement;
                const elements = $form.elements;

                setError(null);

                try {
                    await login({
                        email: (elements.namedItem("email") as HTMLInputElement).value as string,
                        password: (elements.namedItem("password") as HTMLInputElement).value as string
                    });
                } catch (error) {
                    setError(error as Error);
                }
            };

            return <main {...$mainProps}>
                <section className={resolveClassNames(styles.panel, "flex flex-row justify-center items-center")}>
                </section>

                <section className={resolveClassNames(styles.form, "flex flex-row justify-center items-center")}>
                    <form onSubmit={POST} autoComplete="on">
                        <header>
                            <h2 className="flex flex-row justify-start items-center gap-5">
                                <AnchorButton to={`${Madeirense$Enumerators.Pages.App.Welcome}/${Welcome$Enumerators.Forms.login}`} shape="circle">
                                    <Icon name="ArrowLeft" />
                                </AnchorButton>

                                forgot
                            </h2>

                            <p>Deixe o seu email e faremos o envio das suas credenciais</p>
                        </header>

                        <fieldset data-section={type} data-state={state === "authenticating" ? "disabled" : "idle"}>
                            <label htmlFor="email">E-mail</label>
                            <input id="email" name="login" type="email" placeholder="oteuemail@provedor.com" required />

                        </fieldset>

                        {error && <div data-state="error" className="w-full text-center p-1">
                            {error.message}
                        </div>}

                        <Button type="submit" disabled={!assertions.arePasswordsValid || assertions.isLoading} className="mt-2 w-full">
                            {(assertions.isLoading)
                                ? <Icon name="Loading" className="animate-spin" />
                                : "Entrar"
                            }
                        </Button>
                    </form>

                </section>
            </main>
        }

        case "login": {
            async function POST(e: SubmitEvent<HTMLFormElement>) {
                e.preventDefault();

                const $form = e.target as HTMLFormElement;
                const elements = $form.elements;

                setError(null);

                try {
                    await login({
                        email: (elements.namedItem("email") as HTMLInputElement).value as string,
                        password: (elements.namedItem("password") as HTMLInputElement).value as string
                    }, (user) => navigate(Routing.redirectionMap[user.user_role], navigateOptions));
                } catch (error) {
                    setError(error as Error);
                }
            };

            return <main {...$mainProps}>
                <section className={resolveClassNames(styles.panel, "flex flex-row justify-center items-center")}>
                </section>

                <section className={resolveClassNames(styles.form, "flex flex-row justify-center items-center")}>
                    <form onSubmit={POST} autoComplete="on">
                        <header>
                            <h2>Bem-vindo/a ao Madeirense</h2>

                            <p>O melhor da culinária Madeirense em Angola</p>
                        </header>

                        <fieldset data-section={type} data-state={state === "authenticating" ? "disabled" : "idle"}>
                            <label htmlFor="email">E-mail</label>
                            <input id="email" name="login" type="email" placeholder="oteuemail@provedor.com" required />

                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" name="login" placeholder="Password" required />

                            <AnchorButton
                                to={`${Madeirense$Enumerators.Pages.App.Welcome}/${Welcome$Enumerators.Forms.forgot}`}
                                variant="text"
                            >
                                Esqueci-me...
                            </AnchorButton>
                        </fieldset>

                        {error && <div data-state="error" className="w-full text-center p-1">
                            {error.message}
                        </div>}

                        <Button type="submit" disabled={!assertions.arePasswordsValid || assertions.isLoading} className="mt-2 w-full">
                            {(assertions.isLoading)
                                ? <Icon name="Loading" className="animate-spin" />
                                : "Entrar"
                            }
                        </Button>

                        <Link to={`${Madeirense$Enumerators.Pages.App.Welcome}/${Welcome$Enumerators.Forms.signup}`}>
                            Não tenho conta,

                            <span className="font-bold italic">quero inscrever-me</span>
                        </Link>

                    </form>
                </section>

                <span className={resolveClassNames(styles.message, "text-sm whitespace-nowrap")}>ou faça login com</span>

                <OAuthForm className={resolveClassNames(styles.oauth)} onFailedAuthentication={handleOAuthError} />
            </main>
        }

        case "signup": {
            async function POST(e: SubmitEvent<HTMLFormElement>) {
                e.preventDefault();

                const $form = e.target as HTMLFormElement;
                const elements = $form.elements;

                setError(null);

                try {
                    await register({
                        name: [
                            (elements.namedItem("fname") as HTMLInputElement).value as string,
                            (elements.namedItem("lname") as HTMLInputElement).value as string,
                        ].join(' '),
                        email: (elements.namedItem("email") as HTMLInputElement).value as string,
                        password: (elements.namedItem("password") as HTMLInputElement).value as string,
                        phone: [
                            (elements.namedItem("code") as HTMLSelectElement).value as string,
                            parsePhoneNumber((elements.namedItem("phone") as HTMLInputElement).value as string)
                        ].join(''),
                        profile_photo: "",
                        user_role: "Customer"
                    }, (user) => navigate(Routing.redirectionMap[user.user_role], navigateOptions));
                } catch (error) {
                    setError(error as Error)
                }
            };

            return <main {...$mainProps}>
                <section className={resolveClassNames(styles.panel, "flex flex-row justify-center items-center")}>
                </section>

                <section className={resolveClassNames(styles.form, "flex flex-row justify-center items-center")}>
                    <form onSubmit={POST} autoComplete="off">
                        <header>
                            <h2>Bem-vindo/a ao Madeirense</h2>

                            <p>Não se vai arrepender</p>
                        </header>

                        <fieldset data-section={`${type}-name`} className="w-full flex flex-row justify-start items-start gap-2" data-state={state === "authenticating" ? "disabled" : "idle"}>
                            <label htmlFor="fname">
                                <span>Primeiro nome</span>

                                <input id="fname" type="text" name="fname" placeholder="Primeiro nome" required />
                            </label>

                            <label htmlFor="lname">
                                <span>Último Nome</span>

                                <input id="lname" type="text" name="lname" placeholder="Último nome" required />
                            </label>
                        </fieldset>

                        <fieldset data-section={`${type}-contact`} data-state={state === "authenticating" ? "disabled" : "idle"}>
                            <label htmlFor="email">
                                <span>E-mail</span>

                                <input id="email" type="email" name="email" placeholder="oteuemail@provedor.com" required />
                            </label>

                            <label htmlFor="phone">Nº do telefone</label>

                            <div className="flex flex-row justify-start items-center w-full">
                                <select ref={$selectRef} title="Código do telefone" id="code" name="code" defaultValue={""} required>
                                    <option hidden value="">Seleciona um código</option>

                                    {PHONE_CODES.map(({ country, code }) => <option key={code} value={code}>
                                        {`(${code}) ${country}`}
                                    </option>)}
                                </select>

                                <input id="phone" type="tel" name="phone" onChange={selectPhoneCode($selectRef)} placeholder="Nº do telefone" pattern="^(\+?\d{1,4}\s?)?\d{6,15}$" required />
                            </div>
                        </fieldset>

                        <fieldset data-section={`${type}-credentials`} data-state={state === "authenticating" ? "disabled" : "idle"}>
                            <label htmlFor="password">Password</label>
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
                                {validations["password"].map(({ label, validation }) => <li key={label} data-state={password === "" ? "idle" : validation ? "valid" : "error"}>{`> ${label}`}</li>)}
                            </ul>

                            <label htmlFor="password-2">Confirmar password</label>
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
                                {validations["confirmPassword"].map(({ label, validation }) => <li key={label} data-state={confirmPassword === "" ? "idle" : validation ? "valid" : "error"}>{`> ${label}`}</li>)}
                            </ul>
                        </fieldset>

                        {error && <div data-state="error" className="w-full text-center p-1">
                            {error.message}
                        </div>}

                        <Button type="submit" disabled={!assertions.arePasswordsValid || assertions.isLoading} className="mt-2 w-full">
                            {(assertions.isLoading)
                                ? <Icon name="Loading" className="animate-spin" />
                                : "Inscrever"
                            }
                        </Button>

                        <Link to={`${Madeirense$Enumerators.Pages.App.Welcome}/${Welcome$Enumerators.Forms.login}`}>
                            Já tenho conta, quero entrar
                        </Link>
                    </form>
                </section>

                <span className={resolveClassNames(styles.message, "text-sm whitespace-nowrap")}>ou registe-se com</span>

                <OAuthForm className={resolveClassNames(styles.oauth)} onFailedAuthentication={handleOAuthError} />
            </main>
        }
    }
};

export default WelcomePage;