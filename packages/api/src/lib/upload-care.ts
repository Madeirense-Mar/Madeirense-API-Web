
import { UploadClient } from '@uploadcare/upload-client';
import { generateSecureSignature } from '@uploadcare/signed-uploads'

import env from 'env';

// Option A: expiration as timestamp in milliseconds
const { secureSignature, secureExpire } = generateSecureSignature('YOUR_SECRET_KEY', {
  expire: Date.now() + 60 * 60 * 1000 // 30 minutes from now
})

const ucClient = new UploadClient({ 
    publicKey: env.UPLOAD_CARE_PUBLIC_KEY,
    secureExpire,
    secureSignature
});

export default ucClient;
