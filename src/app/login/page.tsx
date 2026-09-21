import { cookies } from "next/headers";
import { AuthStage } from "@/components/auth-stage";
import { FLASH_COOKIE } from "@/lib/auth-cookies";

export default async function LoginPage() {
  const flash = (await cookies()).get(FLASH_COOKIE)?.value ?? null;

  return <AuthStage mode="login" flash={flash} />;
}
