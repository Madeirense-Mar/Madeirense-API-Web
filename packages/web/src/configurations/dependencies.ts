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
            filesViewMode: "grid",
            multipleMin: 1,
            multipleMax: 1,
            localeName: "pt",
            sourceList: "local, facebook, gdrive",
            confirmUpload: true,
            gridShowFileNames: true,
            imgOnly: true,
            useCloudImageEditor: true,
            pubkey: env.UPLOAD_CARE_PUBLIC_KEY
        } as ComponentProps<typeof FileUploaderRegular>
    },
};

export default dependencies;