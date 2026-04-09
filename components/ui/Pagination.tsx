"use client";

import React from 'react';
import styles from './Pagination.module.css';

export type PaginationSize = 'sm' | 'md' | 'lg';

export type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    size?: PaginationSize;
    showFirstLast?: boolean;
    showPreviousNext?: boolean;
    maxVisible?: number;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    size = 'md',
    showFirstLast = false,
    showPreviousNext = true,
    maxVisible = 7,
    className = '',
}) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const halfVisible = Math.floor(maxVisible / 2);

        let startPage = Math.max(1, currentPage - halfVisible);
        let endPage = Math.min(totalPages, currentPage + halfVisible);

        // Adjust if we're near the edges
        if (currentPage <= halfVisible) {
            endPage = Math.min(totalPages, maxVisible);
        }
        if (currentPage + halfVisible >= totalPages) {
            startPage = Math.max(1, totalPages - maxVisible + 1);
        }

        // Add first page with ellipsis if needed
        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) {
                pages.push('...');
            }
        }

        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Add last page with ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push('...');
            }
            pages.push(totalPages);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <nav className={`${styles.pagination} ${styles[`pagination-${size}`]} ${className}`} aria-label="Pagination">
            {/* First page button */}
            {showFirstLast && (
                <button
                    className={`${styles.navButton} ${currentPage === 1 ? styles.disabled : ''}`}
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    aria-label="First page"
                >
                    ««
                </button>
            )}

            {/* Previous page button */}
            {showPreviousNext && (
                <button
                    className={`${styles.navButton} ${currentPage === 1 ? styles.disabled : ''}`}
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                >
                    «
                </button>
            )}

            {/* Page numbers */}
            {pageNumbers.map((page, index) => {
                if (page === '...') {
                    return (
                        <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                            ...
                        </span>
                    );
                }

                const pageNum = page as number;
                const isActive = pageNum === currentPage;

                return (
                    <button
                        key={pageNum}
                        className={`${styles.pageButton} ${isActive ? styles.active : ''}`}
                        onClick={() => onPageChange(pageNum)}
                        aria-label={`Page ${pageNum}`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        {pageNum}
                    </button>
                );
            })}

            {/* Next page button */}
            {showPreviousNext && (
                <button
                    className={`${styles.navButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                >
                    »
                </button>
            )}

            {/* Last page button */}
            {showFirstLast && (
                <button
                    className={`${styles.navButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Last page"
                >
                    »»
                </button>
            )}
        </nav>
    );
};

export default Pagination;
