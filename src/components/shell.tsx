"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Home,
  Landmark,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/actions/auth";
import { useQuickAdd } from "@/components/quick-add";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/transacoes", label: "Extrato", icon: Receipt },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/investimentos", label: "Investir", icon: TrendingUp },
  { href: "/contas", label: "Contas", icon: Landmark },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/dividas", label: "Dívidas", icon: Wallet },
  { href: "/grupos", label: "Grupos", icon: Users },
  { href: "/ia", label: "Assistente", icon: Sparkles },
];

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const add = useQuickAdd();
  const [more, setMore] = useState(false);

  return (
    <div className="min-h-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-card p-4 lg:flex lg:flex-col">
        <Logo className="mb-8 px-2" />
        <nav className="grid gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                  active ? "bg-primary/10 text-primary" : "text-muted hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-2">
          <Button onClick={add.open} className="w-full">
            <Plus className="h-4 w-4" />
            Novo lançamento
          </Button>
          <Link href="/configuracoes" className="px-3 text-sm text-muted hover:text-foreground">
            Ajustes e exportação
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo />
          </div>
          <p className="hidden text-sm text-muted lg:block">Olá, {userName.split(" ")[0]}</p>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-5 pb-28 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-center">
          <Tab href="/dashboard" icon={Home} label="Início" active={pathname === "/dashboard"} />
          <Tab href="/transacoes" icon={Receipt} label="Extrato" active={pathname.startsWith("/transacoes")} />
          <button
            onClick={add.open}
            className="-mt-6 mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-fg shadow-lg"
            aria-label="Novo lançamento"
          >
            <Plus className="h-6 w-6" />
          </button>
          <Tab href="/grupos" icon={Users} label="Grupos" active={pathname.startsWith("/grupos")} />
          <button onClick={() => setMore(true)} className="grid place-items-center gap-1 text-[11px] text-muted">
            <Menu className="h-5 w-5" />
            Mais
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Menu</p>
              <button onClick={() => setMore(false)} className="rounded-full p-2 hover:bg-foreground/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-1">
              {[
                ...links.slice(2),
                { href: "/configuracoes", label: "Ajustes", icon: Menu },
              ].map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMore(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-foreground/5"
                  >
                    <Icon className="h-4 w-4" />
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tab({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("grid place-items-center gap-1 text-[11px]", active ? "text-primary" : "text-muted")}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
