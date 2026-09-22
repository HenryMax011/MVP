import { AuthCard, AuthFooterLink } from "@/components/auth-card";
import { ConfirmEmailForm } from "@/components/auth-forms";

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  return (
    <AuthCard
      title="Confirmar e-mail"
      subtitle="Estamos ativando sua conta. Só um instante."
      footer={<AuthFooterLink href="/login" prompt="Já confirmou?" label="Ir para o login" />}
    >
      <ConfirmEmailForm token={token} />
    </AuthCard>
  );
}
