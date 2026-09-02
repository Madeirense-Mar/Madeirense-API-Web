import {
    type ComponentProps
} from "react";

import { Link } from "react-router-dom";

import {
    getLabel,
    Madeirense$Enumerators,
    resolveClassNames
} from "@Madeirense/shared";

import ProfilePictureButton from "components/buttons/profile";
import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./profileHeader.module.css";

import type {
    Users
} from "@Madeirense/database/browser";

import type { withVariant } from "components/types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    disableActions?: boolean;
    disableLink?: boolean;
    mode?: "default" | "admin";
    user: Users;
};

function ProfileHeaderCard(_props: withVariant<IPropTypes>) {
    const {
        className,
        disableActions = false,
        disableLink = false,
        mode = "default",
        user,
        variant = "primary",
        ...props
    } = _props;

    const {
        name,
        email,
        phone,
        profile_photo,
        user_id,
        user_role,
    } = user;

    return <div className={resolveClassNames(styles[variant], className)} {...props}>
        <ProfilePictureButton src={profile_photo ?? "#"} size="m" />

        {(mode === "admin") && <Link
            to={`${Madeirense$Enumerators.Pages.BackOffice.Staff}/${user_id}`}
            data-type="name"
            className="font-bold text-xl"
        >
            {name}
        </Link>}

        {(mode === "default") && <h3>{name}</h3>}

        <div data-section="contact">
            {(phone !== "") && <span>
                <Icon name="Phone" />

                {phone}
            </span>}

            <span>
                <Icon name="Email" />

                {email}
            </span>
        </div>

        <div data-section="tags">
            {(user_role) && <Tag>
                {getLabel(user_role)}
            </Tag>}
        </div>
    </div>;
};

export default ProfileHeaderCard;