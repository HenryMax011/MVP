"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { resendResetCodeAction, verifyResetCodeAction, type AuthState } from "@/actions/auth";
import { Logo } from "@/components/logo";
import "./verify-code-stage.css";

const LENGTH = 6;
const RESEND_SECONDS = 30;

export function VerifyCodeStage({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyResetCodeAction, null as AuthState);
  const [resendState, resendAction, resending] = useActionState(resendResetCodeAction, null as AuthState);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");
  const complete = code.length === LENGTH;

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  useEffect(() => {
    if (resendState?.sent) {
      setSeconds(RESEND_SECONDS);
      setDigits(Array(LENGTH).fill(""));
      refs.current[0]?.focus();
    }
  }, [resendState?.sent]);

  function applyValue(next: string[], start: number) {
    setDigits(next);
    const filled = next.findIndex((d) => d === "");
    const focusAt = filled === -1 ? LENGTH - 1 : Math.max(start, filled);
    refs.current[focusAt]?.focus();
  }

  function onChange(index: number, raw: string) {
    const only = raw.replace(/\D/g, "");
    if (!only) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    if (only.length > 1) {
      const next = [...digits];
      only.slice(0, LENGTH - index).split("").forEach((d, i) => {
        next[index + i] = d;
      });
      applyValue(next, index);
      return;
    }
    const next = [...digits];
    next[index] = only;
    applyValue(next, index + 1);
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const only = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!only) return;
    const next = Array(LENGTH).fill("");
    only.split("").forEach((d, i) => {
      next[i] = d;
    });
    applyValue(next, only.length);
  }

  return (
    <div className="verify-stage">
      <div>
        <div className="verify-stage__brand">
          <Logo />
        </div>
        <div className="verify-stage__card">
          <div className="verify-stage__lock">
            <Lock size={22} />
          </div>
          <h1>Verifique sua identidade</h1>
          <p>
            Enviamos um código de 6 dígitos para{" "}
            <span className="verify-stage__email">{email}</span>
          </p>

          <form action={action}>
            <input type="hidden" name="code" value={code} />
            <div className="verify-stage__otp">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  value={digit}
                  onChange={(event) => onChange(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(index, event)}
                  onPaste={onPaste}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={index === 0 ? LENGTH : 1}
                  className={digit ? "is-filled" : undefined}
                  aria-label={`Dígito ${index + 1}`}
                />
              ))}
            </div>
            {state?.error && <p className="verify-stage__error">{state.error}</p>}
            <button type="submit" className="verify-stage__submit" disabled={pending || !complete}>
              {pending ? "VERIFICANDO..." : "VERIFICAR CÓDIGO"}
            </button>
          </form>

          <form action={resendAction} className="verify-stage__resend">
            <button type="submit" disabled={resending || seconds > 0}>
              {resending ? "Reenviando..." : "Reenviar código"}
            </button>
            {seconds > 0 ? <span> disponível em {seconds}s</span> : null}
            {resendState?.sent ? <p className="verify-stage__ok">Código reenviado.</p> : null}
            {resendState?.error && <p className="verify-stage__error">{resendState.error}</p>}
          </form>
        </div>
        <p className="verify-stage__back">
          E-mail errado? <Link href="/recuperar">Voltar</Link>
        </p>
      </div>
    </div>
  );
}
