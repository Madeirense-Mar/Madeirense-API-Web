import {
    forwardRef,
    useState,
    type MouseEvent
} from "react";

import { UUID } from "crypto";

import {
    APP_ACCEPTED_IMAGE_UPLOAD_MIMETYPES,
    APP_TTL_DEFAULT,
    formatUUID_UC_CDN_URL,
    resolveClassNames,
    toBase64,
    toBlob
} from "@Madeirense/shared";

import env from "env";

import { useNotifications } from "contexts/Notifications";
import { useProfile } from "contexts/Profile";

import Icon from "components/icon";

import styles from './profile.module.css';

import type { Users } from "@Madeirense/database/browser";

import type { IButtonPropTypes } from "./interfaces";

// ***************************************************************************************************************

interface IPropTypes extends Omit<IButtonPropTypes, ("variant" | "shape")> {
    enableUpload?: boolean,
    src?: string
};

const ProfilePictureButton = forwardRef<HTMLButtonElement, IPropTypes>((_props, ref) => {
    const {
        className,
        disabled = false,
        enableUpload = false,
        size = 's',
        src = "#",
        style,
        ...props
    } = _props;

    const {
        state,
        user,
        update
    } = useProfile();

    const { push } = useNotifications();

    const [uploading, setUploading] = useState(false);

    const $inputId = `${user?.user_id}-uploader`;

    const assertions = {
        "isUploadEnabled": [
            !disabled,
            enableUpload
        ].every(Boolean),
        "isUpdating": [
            (state === "updating-profile"),
            uploading
        ].includes(true)
    }

    async function handleUpload({ target }: { target: HTMLInputElement }) {
        const { files } = target;

        if (!files) return;

        try {
            setUploading(true);

            const base64Data = (await toBase64(files[0]));
            const blob = (await toBlob(base64Data, files[0].name.split('.')[1] ?? ""));

            const pubKey = (env.UPLOAD_CARE_PUBLIC_KEY) as string;

            const formData = new FormData();
            formData.append('UPLOADCARE_PUB_KEY', pubKey);
            formData.append('file', blob);
            formData.append('filename', `USER_${user?.user_id}_${user?.name}_PROFILE_PICTURE`);

            const response = await fetch('https://upload.uploadcare.com/base/', {
                method: 'POST',
                body: formData
            });

            const { file } = (await response.json()) as ({ file: UUID });

            await update({
                ...(user as Users),
                profile_photo: formatUUID_UC_CDN_URL(file) + "-/format/jpeg/"
            });

            push({
                id: "N#PROFILE_PHOTO_UPLOADED",
                type: "alert",
                alert: "Foto de perfil atualizada com sucesso",
                options: {
                    variant: "success",
                    ttl: APP_TTL_DEFAULT
                }
            });
        } catch (error) {
            push({
                id: "N#PROFILE_UPLOAD_ERROR",
                type: "alert",
                alert: (error as Error).message,
                options: {
                    variant: "danger",
                    ttl: APP_TTL_DEFAULT
                }
            });
        } finally {
            setUploading(false);
        }
    };

    function triggerUpload({ target }: MouseEvent<HTMLDivElement>) {
        document.getElementById((target as HTMLDivElement).dataset.value as string)?.click();
    };

    return <button
        className={resolveClassNames(styles[size], className)}
        style={(src) ? { backgroundImage: `url(${src})`, ...style } : style}
        {...props}
        {...{ disabled, ref }}
    >
        {assertions.isUploadEnabled && <>
            <div data-value={$inputId} onClick={triggerUpload}>
                {assertions.isUpdating ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Camera" />}
            </div>

            <input 
                accept={APP_ACCEPTED_IMAGE_UPLOAD_MIMETYPES.join(',')} 
                id={$inputId} 
                title="upload file" 
                type="file" 
                className="hidden" 
                onChange={handleUpload} 
            />
        </>}
    </button>
});

export default ProfilePictureButton;