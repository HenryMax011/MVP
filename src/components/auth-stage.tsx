"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock, User } from "lucide-react";
import { loginAction, startSignupAction, type AuthState } from "@/actions/auth";
import { Logo } from "@/components/logo";
import "./auth-stage.css";

export function AuthStage({
  mode = "login",
  flash,
}: {
  mode?: "login" | "signup";
  flash?: string | null;
}) {
  const signup = mode === "signup";

  return (
    <div className="auth-stage">
      <div className="auth-stage__shell">
        <div className="auth-stage__title">
          <Logo tone="onDark" />
        </div>
        <div className="auth-stage__card">
          <aside className="auth-stage__aside">
            {signup ? (
              <>
                <h2>Olá.</h2>
                <p>Crie sua conta e comece a organizar o dinheiro em poucos minutos.</p>
              </>
            ) : (
              <>
                <h2>Bem-vindo de volta.</h2>
                <p>Suas finanças, seus gráficos e seus planos — tudo no lugar em que você deixou.</p>
              </>
            )}
          </aside>
          <div className="auth-stage__main">
            {signup ? <SignupPanel /> : <LoginPanel flash={flash} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPanel({ flash }: { flash?: string | null }) {
  const [state, action, pending] = useActionState(loginAction, null as AuthState);

  return (
    <form action={action} autoComplete="on" className="auth-stage__form">
      <h2 className="auth-stage__heading">Entrar</h2>
      {flash && <p className="auth-stage__flash">{flash}</p>}
      <label className="auth-stage__field">
        <span className="sr-only">E-mail</span>
        <input name="email" type="email" autoComplete="username" required placeholder="E-mail" />
        <User className="auth-stage__icon" aria-hidden />
      </label>
      <label className="auth-stage__field">
        <span className="sr-only">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="Senha"
        />
        <Lock className="auth-stage__icon" aria-hidden />
      </label>
      <div className="auth-stage__row">
        <label className="auth-stage__check">
          <input type="checkbox" defaultChecked name="remember" />
          Lembrar de mim
        </label>
        <Link href="/recuperar" className="auth-stage__link">
          Esqueceu a senha?
        </Link>
      </div>
      {state?.error && <p className="auth-stage__error">{state.error}</p>}
      <button type="submit" className="auth-stage__submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
      <p className="auth-stage__switch">
        Não tem conta? <Link href="/cadastro">Criar conta</Link>
      </p>
    </form>
  );
}

function SignupPanel() {
  const [state, action, pending] = useActionState(startSignupAction, null as AuthState);

  return (
    <form action={action} autoComplete="on" className="auth-stage__form">
      <h2 className="auth-stage__heading">Criar conta</h2>
      <label className="auth-stage__field">
        <span className="sr-only">E-mail</span>
        <input name="email" type="email" autoComplete="email" required placeholder="E-mail" />
        <User className="auth-stage__icon" aria-hidden />
      </label>
      {state?.error && <p className="auth-stage__error">{state.error}</p>}
      <button type="submit" className="auth-stage__submit" disabled={pending}>
        {pending ? "Continuando..." : "Continuar"}
      </button>
      <p className="auth-stage__switch">
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </form>
  );
}
