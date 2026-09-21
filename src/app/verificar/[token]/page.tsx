import { AuthCard } from "@/components/auth-card";
import { ConfirmEmailForm } from "@/components/auth-forms";

export default async function VerificarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthCard
      title="Confirmar e-mail"
      subtitle="Clique no botão para ativar sua conta. Nada da senha transita nesta página."
    >
      <ConfirmEmailForm token={token} />
    </AuthCard>
  );
}
