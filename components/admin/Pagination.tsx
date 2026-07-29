'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
    page: number;
    pageCount: number;
    total: number;
    pageSize: number;
    /** Rows actually rendered on this page — drives the "1–25 sur 240" range. */
    shown: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
    /** Noun used in the range label, e.g. "expédition". */
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
    noun = 'résultat',
}: PaginationProps) {
    if (total === 0) return null;

    const from = (page - 1) * pageSize + 1;
    const to = from + shown - 1;
    const plural = total > 1 ? 's' : '';

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
                <span className="font-medium text-ink-950">{from}–{to}</span>
                {' '}sur <span className="font-medium text-ink-950">{total}</span> {noun}{plural}
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
                        <ChevronLeft className="h-4 w-4" /> Précédent
                    </Button>
                    <span className="text-xs text-slate-500 tabular-nums">
                        Page {page} / {pageCount}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white gap-1"
                        onClick={() => onPageChange(page + 1)}
                        disabled={disabled || page >= pageCount}
                    >
                        Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
