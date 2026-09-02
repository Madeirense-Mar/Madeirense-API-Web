import {
    useEffect,
    useState,
    type ComponentProps
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    Madeirense$Enumerators,
    resolveClassNames
} from "@Madeirense/shared";

import { Statuses } from "utilities/enumerators";

import MXP$App from "configurations";

import AppSettings from "settings";

import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./index.module.css";

import type { variantType } from "components/types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"main"> {
    onAuthSuccess?: (user: any) => void;
    redirectURL?: string;
};

const stateVariantMap: Record<(keyof typeof Statuses), variantType> = {
    "error": "danger",
    "fetching": "primary",
    "idle": "primary",
    "loading": "primary",
    "success": "success",
    "syncing": "primary",
    "updating": "primary"
};

const AuthenticationSuccessPage = ({
    onAuthSuccess,
    redirectURL = Madeirense$Enumerators.Pages.App.Layout,
    ..._props
}: IPropTypes) => {
    const {
        Routing
    } = AppSettings;

    const {
        authentication
    } = MXP$App.Base.Business.endpoints;

    const {
        className,
        ...props
    } = _props;

    const navigate = useNavigate();

    const [errorMessage, setErrorMessage] = useState<string>("");
    const [state, setState] = useState<keyof typeof Statuses>("loading");

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                setState("loading");

                const user = await authentication.handleOAuthSuccess();

                if (!user) throw new Error("Failed to authenticate user")

                setState("success");

                onAuthSuccess?.(user);

                setTimeout(() => {
                    navigate(redirectURL ?? Routing.redirectionMap[user.user_role]);
                }, 1500);
            } catch (error) {
                console.error("[OAuthSuccess] INFO |", { error });

                setState("error");

                setErrorMessage(error instanceof Error ? error.message : "Authentication failed");

                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        };

        handleOAuthCallback();
    }, [
        navigate,
        onAuthSuccess,
        redirectURL
    ]);

    const $mainProps = {
        className: resolveClassNames(styles[stateVariantMap[state]]),
        ...props
    };

    const renderContent = (status: typeof state) => {
        switch (status) {
            case "error": {
                return <section>
                    <Icon name="Close" />

                    <h2>
                        Falha na autenticação
                    </h2>

                    <Tag variant="danger">
                        {errorMessage}
                    </Tag>

                    <p>
                        A redirecionar para a página de login...
                    </p>
                </section>
            };

            case "loading": {
                return <section>
                    <div className={styles.spinner}></div>

                    <h2 className="animate-pulse">
                        Em autenticação...
                    </h2>

                    <p>
                        Por favor, aguarde enquanto terminamos.
                    </p>
                </section>
            };

            case "success": {
                return <section>
                    <Icon name="Check" />

                    <h2>
                        Bem-vindo/a ao Madeirense!
                    </h2>

                    <p>
                        A redirecionar...
                    </p>
                </section>
            };

            default: {
                return null;
            };
        }
    };

    return <main {...$mainProps}>
        {renderContent(state)}
    </main>
};

export default AuthenticationSuccessPage;