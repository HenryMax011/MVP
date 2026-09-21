import { cn } from "@/lib/cn";
import { formatBRL, formatBRLSigned } from "@/lib/format";

export function Money({
  cents,
  signed = false,
  className,
}: {
  cents: number;
  signed?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("tabular", className)}>
      {signed ? formatBRLSigned(cents) : formatBRL(cents)}
    </span>
  );
}
