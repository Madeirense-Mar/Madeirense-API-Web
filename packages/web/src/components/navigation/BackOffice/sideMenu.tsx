import {
    JSX,
    useState,
    type ComponentProps,
} from "react";

import {
    Link,
    useLocation
} from "react-router-dom";

import {
    Madeirense$Enumerators,
    resolveClassNames
} from "@Madeirense/shared";

import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import Icon from "components/icon";

import styles from "./sideMenu.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";
import { Root$Enumerators } from "styles/enumerators";

// ***************************************************************************************************************

const linkList: ReadonlyArray<{
    to: string,
    label: string,
    icon: JSX.Element,
    role: ReadonlyArray<$Enums.Users_user_role>
}> = ([
    {
        to: Madeirense$Enumerators.Pages.BackOffice.Layout,
        label: "Dashboard",
        icon: <Icon name="Dashboard" />,
        role: [
            "Admin",
            "Driver",
            "Staff"
        ]
    },
    {
        to: Madeirense$Enumerators.Pages.BackOffice.Staff,
        label: "Utilizadores",
        icon: <Icon name="Users" />,
        role: [
            "Admin"
        ]
    },
    {
        to: Madeirense$Enumerators.Pages.BackOffice.Products,
        label: "Menu",
        icon: <Icon name="FoodMenu" />,
        role: [
            "Admin"
        ]
    },
    {
        to: Madeirense$Enumerators.Pages.BackOffice.Restaurant,
        label: "Restaurantes",
        icon: <Icon name="Store" />,
        role: [
            "Admin"
        ]
    },
    {
        to: Madeirense$Enumerators.Pages.BackOffice.Requests,
        label: "Pedidos",
        icon: <Icon name="Order" />,
        role: [
            "Admin",
            "Driver",
            "Staff"
        ]
    },
    {
        to: Madeirense$Enumerators.Pages.BackOffice.Deliveries,
        label: "Entregas",
        icon: <Icon name="Delivery" />,
        role: [
            "Admin",
            "Driver",
            "Staff"
        ]
    },
    {
        to: Madeirense$Enumerators.Pages.BackOffice.Settings,
        label: "Definições",
        icon: <Icon name="Settings" />,
        role: [
            "Admin"
        ]
    }
]);

function SideMenu({ className, ...props }: ComponentProps<"aside">) {
    const location = useLocation();

    const {
        user
    } = useProfile();

    const [toggled, toggle] = useState<boolean>(false);

    const toggleMenu = () => toggle(t => !t);
    
    return <aside
        className={resolveClassNames(styles.menu, className)}
        {...{
            ...((toggled) ? { [Root$Enumerators.Attributes.States.toggled]: "" } : {})
        }}
        {...props}
    >
        <Button id="toggler" title="Abrir/Fechar" shape="circle" onClick={toggleMenu}>
            <Icon name="ChevronRight" className={toggled ? "rotate-180" : ""} />
        </Button>

        <ul className="flex flex-col justify-start items-start gap-6 w-full">
            {linkList.map((link, index) => {
                if (!(link.role).includes(user?.user_role ?? "Ghost"))
                    return null;

                return <li key={link.to} className="w-full">
                    <Link
                        className="flex flex-row justify-start items-center gap-2"
                        key={index}
                        to={link.to}
                        {...{ ...(location.pathname === link.to) ? { "data-active": "" } : {} }}
                    >
                        {link.icon}

                        {link.label}
                    </Link>
                </li>;
            })}
        </ul>
    </aside>
};

export default SideMenu;