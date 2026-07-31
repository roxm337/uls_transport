'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/lib/i18n/context';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** What is about to happen, and what it costs. */
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Red confirm button; on by default because these are deletions. */
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
}

/**
 * The project's confirmation prompt.
 *
 * Destructive actions used to call the browser's `confirm()`: an unstyled
 * OS dialog that ignores the design system, cannot show formatted detail,
 * and blocks the whole tab while it waits. This keeps the prompt inside the
 * application, and holds itself open with a spinner while the action runs
 * so nothing can be double-submitted.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel,
    destructive = true,
    onConfirm,
}: ConfirmDialogProps) {
    const { t } = useLanguage();
    const [pending, setPending] = React.useState(false);

    async function handleConfirm(event: React.MouseEvent) {
        // Radix closes on click; hold it open until the work finishes so the
        // spinner is visible and a second click cannot land.
        event.preventDefault();
        setPending(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } finally {
            setPending(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="text-sm text-muted-foreground">{description}</div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>{cancelLabel ?? t.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={pending}
                        className={destructive ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                    >
                        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {confirmLabel ?? t.common.confirm}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
