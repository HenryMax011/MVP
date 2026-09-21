import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { VerifyCodeStage } from "@/components/verify-code-stage";
import { RESET_EMAIL_COOKIE, maskEmail } from "@/lib/auth-cookies";

export default async function RecuperarCodigoPage() {
  const email = (await cookies()).get(RESET_EMAIL_COOKIE)?.value;
  if (!email) redirect("/recuperar");

  return <VerifyCodeStage email={maskEmail(email)} />;
}
