import { headers } from "next/headers";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function isLocalHost(value: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
}

export async function appUrl() {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0]?.trim();
    if (host) {
      const forwarded = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const proto =
        forwarded || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // Fora de um request (script, cron): cai nos fallbacks abaixo.
  }

  const configured = process.env.APP_URL ? stripSlash(process.env.APP_URL) : "";
  if (configured && !isLocalHost(configured)) {
    return configured;
  }

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) {
    return `https://${vercelHost.replace(/^https?:\/\//, "")}`;
  }

  return configured || "http://localhost:3000";
}
