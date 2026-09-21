import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-primary text-primary-fg shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_14px_-8px_rgba(12,138,93,0.7)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
        <path
          d="M4 16.5 9.2 11l3.1 3.1L20 6.5"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M15.2 6.5H20V11" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "onDark";
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[17px] font-bold tracking-[-0.04em]",
            tone === "onDark" ? "text-[#f3eee4]" : "text-foreground",
          )}
        >
          MVP
        </span>
        <span
          className={cn(
            "mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em]",
            tone === "onDark" ? "text-[#c4a36a]" : "text-muted",
          )}
        >
          Finanças
        </span>
      </span>
    </div>
  );
}
