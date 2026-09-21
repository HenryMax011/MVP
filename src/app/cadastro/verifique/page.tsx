import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthCard, AuthFooterLink } from "@/components/auth-card";
import { ResendVerificationButton } from "@/components/auth-forms";
import { SIGNUP_EMAIL_COOKIE, maskEmail } from "@/lib/auth-cookies";

export default async function CadastroVerifiquePage() {
  const email = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
  if (!email) redirect("/cadastro");

  return (
    <AuthCard
      title="Verifique seu e-mail"
      subtitle={`Enviamos um link para ${maskEmail(email)}. Abra o Gmail, confirme a conta e depois entre.`}
      step={{ current: 3, total: 3, label: "Verificação" }}
      footer={<AuthFooterLink href="/login" prompt="Já confirmou?" label="Ir para o login" />}
    >
      <div className="grid gap-3">
        <p className="rounded-xl bg-foreground/5 px-3 py-2 text-sm text-muted">
          Olhe também a caixa de spam. O link vale por 24 horas.
        </p>
        <ResendVerificationButton />
      </div>
    </AuthCard>
  );
}
