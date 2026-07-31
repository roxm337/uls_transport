'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, Pencil, Trash, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/lib/i18n/context';

interface RowActionsProps {
    /** Detail page for this row. */
    href: string;
    onEdit: () => void;
    /** Omit to hide the entry — deletions are ADMIN-only. */
    onDelete?: () => void;
    /** Announced to screen readers, e.g. "Transports Bernard". */
    label: string;
}

/**
 * Per-row menu for the CRM tables.
 *
 * Editing or deleting a record used to mean opening its detail page first
 * and coming back — three navigations for a one-field correction. The list
 * is where the work starts, so the actions belong there too.
 */
export function RowActions({ href, onEdit, onDelete, label }: RowActionsProps) {
    const { t } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-ink-950"
                    aria-label={t.rowActions.label(label)}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                    <Link href={href} className="cursor-pointer">
                        <ExternalLink className="mr-2 h-4 w-4" /> {t.rowActions.open}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onEdit} className="cursor-pointer">
                    <Pencil className="mr-2 h-4 w-4" /> {t.rowActions.edit}
                </DropdownMenuItem>
                {onDelete && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={onDelete}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                            <Trash className="mr-2 h-4 w-4" /> {t.rowActions.delete}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
