import { 
    type ComponentProps
 } from 'react';

import { QueryClientConfig } from '@tanstack/react-query';
import { FileUploaderRegular } from '@uploadcare/react-uploader';

import env from 'env';

// ***************************************************************************************************************

const dependencies = {
    "@tanstack/react-query": {
        queries: {
            refetchOnWindowFocus: false
        }
    } as QueryClientConfig,
    "@uploadcare/react-uploader": {
        fileUploaderRegularDefaultProps: {
            confirmUpload: true,
            filesViewMode: "grid",
            gridShowFileNames: true,
            imgOnly: true,
            localeName: "pt",
            multipleMax: 1,
            multipleMin: 1,
            pubkey: env.UPLOAD_CARE_PUBLIC_KEY,
            sourceList: "local, facebook, gdrive",
            useCloudImageEditor: true,
        } as ComponentProps<typeof FileUploaderRegular>
    },
};

export default dependencies;