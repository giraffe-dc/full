"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Breadcrumbs.module.css";

export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: string;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    homeLabel?: string;
    homeIcon?: string;
}

export function Breadcrumbs({ items, homeLabel = "Головна", homeIcon = "🏠" }: BreadcrumbsProps) {
    const pathname = usePathname();

    // Generate breadcrumbs from pathname if items not provided
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        if (items) return items;

        const segments = pathname.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [];

        // Add home
        breadcrumbs.push({
            label: homeLabel,
            href: '/',
            icon: homeIcon,
        });

        // Add segments
        let href = '';
        for (const segment of segments) {
            href += `/${segment}`;

            // Convert segment to readable label
            const label = segment
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            breadcrumbs.push({
                label,
                href,
            });
        }

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    return (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
            {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                    <div key={item.href || index} className={styles.crumb}>
                        {!isLast && item.href ? (
                            <Link
                                href={item.href}
                                className={styles.crumbLink}
                            >
                                {item.icon && <span className={styles.crumbIcon}>{item.icon}</span>}
                                <span className={styles.crumbLabel}>{item.label}</span>
                            </Link>
                        ) : (
                            <span className={`${styles.crumbCurrent} ${isLast ? styles.last : ''}`}>
                                {item.icon && <span className={styles.crumbIcon}>{item.icon}</span>}
                                <span className={styles.crumbLabel}>{item.label}</span>
                            </span>
                        )}

                        {!isLast && (
                            <span className={styles.separator}>/</span>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

export default Breadcrumbs;
