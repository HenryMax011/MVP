import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthCard, AuthFooterLink } from "@/components/auth-card";
import { NewPasswordForm } from "@/components/auth-forms";
import { RESET_EMAIL_COOKIE, RESET_TICKET_COOKIE } from "@/lib/auth-cookies";

export default async function RecuperarSenhaPage() {
  const store = await cookies();
  const email = store.get(RESET_EMAIL_COOKIE)?.value;
  const ticket = store.get(RESET_TICKET_COOKIE)?.value;
  if (!email || !ticket) redirect("/recuperar");

  return (
    <AuthCard
      title="Nova senha"
      subtitle="Escolha uma senha nova. Depois você entra normalmente."
      step={{ current: 3, total: 3, label: "Senha" }}
      footer={<AuthFooterLink href="/login" prompt="Cancelar e" label="voltar ao login" />}
    >
      <NewPasswordForm />
    </AuthCard>
  );
}
