'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/context';

interface PaginationProps {
    page: number;
    pageCount: number;
    total: number;
    pageSize: number;
    /** Rows actually rendered on this page — drives the "1–25 sur 240" range. */
    shown: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
    /** Noun used in the range label, already in the current language. */
    noun?: string;
}

export function Pagination({
    page,
    pageCount,
    total,
    pageSize,
    shown,
    onPageChange,
    disabled,
    noun,
}: PaginationProps) {
    const { t } = useLanguage();

    if (total === 0) return null;

    const from = (page - 1) * pageSize + 1;
    const to = from + shown - 1;

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
                {t.pagination.range(from, to, total, noun ?? t.pagination.result)}
            </p>

            {pageCount > 1 && (
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white gap-1"
                        onClick={() => onPageChange(page - 1)}
                        disabled={disabled || page <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" /> {t.pagination.previous}
                    </Button>
                    <span className="text-xs text-slate-500 tabular-nums">
                        {t.pagination.page(page, pageCount)}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white gap-1"
                        onClick={() => onPageChange(page + 1)}
                        disabled={disabled || page >= pageCount}
                    >
                        {t.pagination.next} <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
