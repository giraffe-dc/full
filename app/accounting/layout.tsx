
import { AccountingSidebar } from "../../components/accounting/Sidebar";
import styles from "./layout.module.css";
import { Suspense } from "react";

export default function AccountingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.container}>
            <Suspense fallback={<div style={{ width: '240px', background: '#f7fafc' }}>Loading...</div>}>
                <AccountingSidebar />
            </Suspense>
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
