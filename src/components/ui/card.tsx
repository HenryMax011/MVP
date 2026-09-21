import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-card p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-sm font-semibold", className)}>{children}</h2>;
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "green" | "red" | "amber";
}) {
  const tones = {
    muted: "bg-foreground/5 text-muted",
    green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    red: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}
