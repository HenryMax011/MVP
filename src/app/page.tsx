import Link from "next/link";
import { ArrowRight, Bot, PieChart, Shield, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-full bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex gap-2">
          <Link href="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link href="/cadastro">
            <Button>Criar conta</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-sm font-medium text-primary">Pessoal e compartilhado</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Suas finanças claras. As contas do grupo, justas.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Controle saldo, gastos, contas e cartões. Divida despesas com amigos e converse com um assistente que enxerga os seus números.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/cadastro">
            <Button size="lg">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Já tenho conta
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: PieChart, title: "Dashboard vivo", text: "Saldo, entradas, despesas e o que ainda sobra no mês." },
            { icon: Users, title: "Grupos", text: "Divisão igual, percentual ou customizada, com acerto simplificado." },
            { icon: Shield, title: "Privacidade", text: "Ninguém vê o seu extrato pessoal — só o saldo do grupo." },
            { icon: Bot, title: "Assistente", text: "Pergunte em português quanto gastou e se cabe um extra no fim de semana." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-card p-4">
              <f.icon className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
