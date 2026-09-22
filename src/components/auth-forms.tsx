"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  completeResetAction,
  completeSignupAction,
  confirmEmailAction,
  loginAction,
  requestResetAction,
  resendResetCodeAction,
  resendVerificationAction,
  startSignupAction,
  verifyResetCodeAction,
  type AuthState,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function EmailStepForm() {
  const [state, action, pending] = useActionState(startSignupAction, null as AuthState);
  return (
    <form action={action} autoComplete="on" className="grid gap-3">
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" required placeholder="voce@gmail.com" />
      </Field>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Continuando..." : "Continuar"}
      </Button>
    </form>
  );
}

export function CompleteSignupForm() {
  const [state, action, pending] = useActionState(completeSignupAction, null as AuthState);
  return (
    <form action={action} autoComplete="on" className="grid gap-3">
      <Field label="Nome">
        <Input name="name" autoComplete="name" required />
      </Field>
      <Field label="Senha">
        <Input name="password" type="password" autoComplete="new-password" required minLength={6} />
      </Field>
      <Field label="Confirmar senha">
        <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} />
      </Field>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando verificação..." : "Criar conta e verificar e-mail"}
      </Button>
    </form>
  );
}

export function LoginForm({ flash }: { flash?: string | null }) {
  const [state, action, pending] = useActionState(loginAction, null as AuthState);
  return (
    <form action={action} autoComplete="on" className="grid gap-3">
      {flash && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{flash}</p>}
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Senha">
        <Input name="password" type="password" autoComplete="current-password" required minLength={6} />
      </Field>
      <p className="text-xs text-muted">Este acesso fica lembrado por 14 dias neste navegador.</p>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <Link href="/recuperar" className="text-center text-sm font-medium text-primary">
        Esqueci a senha
      </Link>
    </form>
  );
}

export function ResendVerificationButton() {
  const [state, action, pending] = useActionState(resendVerificationAction, null as AuthState);
  return (
    <form action={action}>
      <Button type="submit" variant="outline" disabled={pending} className="w-full">
        {pending ? "Reenviando..." : "Reenviar e-mail"}
      </Button>
      {state?.sent && <p className="mt-2 text-sm text-emerald-700">E-mail reenviado.</p>}
      {state?.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
    </form>
  );
}

export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmEmailAction, null as AuthState);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    formRef.current?.requestSubmit();
  }, [token]);

  if (!token) {
    return <p className="text-sm text-rose-600">Este link está incompleto. Solicite um novo e-mail de verificação.</p>;
  }

  return (
    <form ref={formRef} action={action} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Confirmando..." : "Confirmar meu e-mail"}
      </Button>
    </form>
  );
}

export function ForgotEmailForm() {
  const [state, action, pending] = useActionState(requestResetAction, null as AuthState);
  return (
    <form action={action} autoComplete="on" className="grid gap-3">
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando código..." : "Enviar código"}
      </Button>
    </form>
  );
}

export function ResetCodeForm() {
  const [state, action, pending] = useActionState(verifyResetCodeAction, null as AuthState);
  const [resendState, resendAction, resending] = useActionState(resendResetCodeAction, null as AuthState);
  return (
    <div className="grid gap-3">
      <form action={action} className="grid gap-3">
        <Field label="Código de 6 dígitos">
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            pattern="\d{6}"
            placeholder="000000"
            className="tracking-[0.4em] text-center text-lg"
          />
        </Field>
        {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Verificando..." : "Validar código"}
        </Button>
      </form>
      <form action={resendAction}>
        <Button type="submit" variant="outline" disabled={resending} className="w-full">
          {resending ? "Reenviando..." : "Reenviar código"}
        </Button>
        {resendState?.sent && <p className="mt-2 text-sm text-emerald-700">Código reenviado.</p>}
        {resendState?.error && <p className="mt-2 text-sm text-rose-600">{resendState.error}</p>}
      </form>
    </div>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(completeResetAction, null as AuthState);
  return (
    <form action={action} autoComplete="on" className="grid gap-3">
      <Field label="Nova senha">
        <Input name="password" type="password" autoComplete="new-password" required minLength={6} />
      </Field>
      <Field label="Confirmar nova senha">
        <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} />
      </Field>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
