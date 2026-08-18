import {
    JSX
} from "react";

import {
    Link,
    useLocation,
    useNavigate
} from "react-router-dom";

import {
    Madeirense$Enumerators
} from "@Madeirense/shared";

import { useCart } from "contexts/Cart";
import { useNotifications } from "contexts/Notifications";
import { useOrders } from "contexts/Orders";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import ProfilePictureButton from "components/buttons/profile";
import Icon from "components/icon";

import AnchorButton from "components/buttons/anchor";

import { Welcome$Enumerators } from "pages/Welcome";

import styles from "./application.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

const linkList: ReadonlyArray<{
    to: string,
    label: string,
    icon: JSX.Element,
    role?: ReadonlyArray<$Enums.Users_user_role>
}> = ([
    {
        to: Madeirense$Enumerators.Pages.App.Layout,
        label: "Menu",
        icon: <Icon name="Food" />
    },
    {
        to: Madeirense$Enumerators.Pages.App.Order,
        label: "Pedidos",
        role: ["Customer", "Admin", "Driver", "Staff"],
        icon: <Icon name="Order" />
    },
    {
        to: Madeirense$Enumerators.Pages.App.Events,
        label: "Eventos",
        icon: <Icon name="Party" />
    },
    // TODO: Add resort link to list
    // {
    //     to: Madeirense$Enumerators.Pages.App.Resort,
    //     label: "Eventos",
    //     icon: <Icon name="Beach" />
    // },
    {
        to: Madeirense$Enumerators.Pages.BackOffice.Layout,
        label: "Back Office",
        role: ["Admin", "Driver", "Staff"],
        icon: <Icon name="Dashboard" />
    }
]);

function AppNav() {
    const {
        clear$Dry: clearCart
    } = useCart();

    const location = useLocation();
    const navigate = useNavigate();
    const { push } = useNotifications();

    const {
        clear$Dry: clearOrders
    } = useOrders();

    const {
        logout,
        state,
        user
    } = useProfile();

    function gotoProfile() {
        navigate("/profile");
    };

    async function handleLogout() {
        try {
            clearCart("all");
            clearOrders();

            await logout();
        } catch (error) {
            push({
                id: "N#LOGOUT_ISSUE",
                type: "alert",
                alert: (error as Error).message,
                options: {
                    variant: "danger"
                }
            })
        } finally {
            navigate("/", { replace: true });
        }
    };

    const assertions = {
        "hideUserInteractions": (
            location.pathname.includes("profile")
        )
    };

    return <nav className={styles.nav}>
        <p data-element="header">
            O MADEIRENSE
        </p>

        <ul className="flex flex-row justify-start items-center gap-8 ml-2 mr-auto">
            {linkList.map((link, index) => {
                if (!(link.role ?? [user?.user_role]).includes(user?.user_role as $Enums.Users_user_role)) return null;

                return <li key={link.to}>
                    <Link
                        key={index}
                        to={link.to}
                        data-active={link.to === "/" ? location.pathname === link.to : location.pathname.includes(link.to)}
                        className="flex flex-row justify-start items-center gap-1"
                    >
                        {link.icon}

                        {link.label}
                    </Link>
                </li>;
            })}
        </ul>

        {(state === "guest")
            ? <div className="flex flex-row items-center justify-center">
                <AnchorButton
                    id="sign-up"
                    to={`${Madeirense$Enumerators.Pages.App.Welcome}/${Welcome$Enumerators.Forms.signup}`}
                    variant="primary"
                >
                    <Icon name="UserRegistration" />

                    Inscreva-se
                </AnchorButton>

                <AnchorButton
                    id="login"
                    to={`${Madeirense$Enumerators.Pages.App.Welcome}/${Welcome$Enumerators.Forms.login}`}
                    variant="primary"
                >
                    <Icon name="Login" />

                    Login
                </AnchorButton>
            </div>

            : <>
                {!assertions.hideUserInteractions && <Button shape="circle" variant="primary" onClick={handleLogout}>
                    <Icon name="Logout" />
                </Button>}
            </>
        }

        {(!assertions.hideUserInteractions && user) && <ProfilePictureButton
            src={user.profile_photo ?? "#"}
            onClick={gotoProfile}
        />}
    </nav>
}

export default AppNav;