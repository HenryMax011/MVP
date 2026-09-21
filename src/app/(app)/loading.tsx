export default function Loading() {
  return (
    <div className="grid animate-pulse gap-4">
      <div className="h-8 w-48 rounded-lg bg-foreground/10" />
      <div className="h-28 rounded-2xl bg-foreground/10" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-28 rounded-2xl bg-foreground/10" />
        <div className="h-28 rounded-2xl bg-foreground/10" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-2xl bg-foreground/10" />
        <div className="h-24 rounded-2xl bg-foreground/10" />
        <div className="h-24 rounded-2xl bg-foreground/10" />
      </div>
    </div>
  );
}
