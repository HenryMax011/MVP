import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import "./auth-card.css";

export function AuthCard({
  title,
  subtitle,
  step,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  step?: { current: number; total: number; label: string };
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-box">
      <div className="auth-box__shell">
        <div className="auth-box__brand">
          <Logo tone="onDark" />
        </div>
        <div className="auth-box__card">
          {step && (
            <p className="auth-box__step">
              Passo {step.current} de {step.total} · {step.label}
            </p>
          )}
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
          {footer && <div className="auth-box__footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function AuthFooterLink({ href, prompt, label }: { href: string; prompt: string; label: string }) {
  return (
    <p>
      {prompt}{" "}
      <Link href={href}>
        {label}
      </Link>
    </p>
  );
}
