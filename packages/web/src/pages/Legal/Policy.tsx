import LegalDocumentView from "components/views/legal/document";

import styles from "./page.module.css";

// ***************************************************************************************************************

function PrivacyPolicyPage() {
    return <main className={styles.page}>
        <LegalDocumentView slug="privacy" />
    </main>
};

export default PrivacyPolicyPage;