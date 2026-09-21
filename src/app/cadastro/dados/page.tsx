import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthCard, AuthFooterLink } from "@/components/auth-card";
import { CompleteSignupForm } from "@/components/auth-forms";
import { SIGNUP_EMAIL_COOKIE, maskEmail } from "@/lib/auth-cookies";

export default async function CadastroDadosPage() {
  const email = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
  if (!email) redirect("/cadastro");

  return (
    <AuthCard
      title="Termine sua conta"
      subtitle={`Completando o cadastro de ${maskEmail(email)}. Em seguida enviamos a verificação para o Gmail.`}
      step={{ current: 2, total: 3, label: "Dados" }}
      footer={<AuthFooterLink href="/cadastro" prompt="E-mail errado?" label="Voltar" />}
    >
      <CompleteSignupForm />
    </AuthCard>
  );
}
