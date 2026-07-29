import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
}

export function Spinner({ className, size = 24, ...props }: SpinnerProps) {
    return (
        <div className={cn("flex items-center justify-center", className)} {...props}>
            <Loader2 className="animate-spin text-ink-900" size={size} />
        </div>
    );
}
