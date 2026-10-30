import LegalDocumentView from "components/views/legal/document";

import styles from "./page.module.css";

// ***************************************************************************************************************

function TermsAndConditionsPage() {
    return <main className={styles.page}>
        <LegalDocumentView slug="terms" />
    </main>
};

export default TermsAndConditionsPage;