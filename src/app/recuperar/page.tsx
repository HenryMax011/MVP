import { AuthCard, AuthFooterLink } from "@/components/auth-card";
import { ForgotEmailForm } from "@/components/auth-forms";

export default function RecuperarPage() {
  return (
    <AuthCard
      title="Esqueci a senha"
      subtitle="Informe o e-mail da conta. Se ele existir, enviamos um código de 6 dígitos."
      step={{ current: 1, total: 3, label: "E-mail" }}
      footer={<AuthFooterLink href="/login" prompt="Lembrou a senha?" label="Entrar" />}
    >
      <ForgotEmailForm />
    </AuthCard>
  );
}
