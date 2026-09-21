import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/shell";
import { QuickAddProvider } from "@/components/quick-add";
import { runHousekeeping } from "@/lib/housekeeping";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  await runHousekeeping(session.userId);

  return (
    <QuickAddProvider>
      <AppShell userName={session.name}>{children}</AppShell>
    </QuickAddProvider>
  );
}
