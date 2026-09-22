import { headers } from "next/headers";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function isLocalHost(value: string) {
  return /(localhost|127\.0\.0\.1)/i.test(value);
}

function configuredPublicUrl() {
  const publicUrl = process.env.PUBLIC_APP_URL ? stripSlash(process.env.PUBLIC_APP_URL) : "";
  if (publicUrl && !isLocalHost(publicUrl)) return publicUrl;
  const configured = process.env.APP_URL ? stripSlash(process.env.APP_URL) : "";
  if (configured && !isLocalHost(configured)) return configured;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "")}`;
  return "";
}

async function requestUrl() {
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
    // Fora de um request (script, cron).
  }
  return "";
}

export async function appUrl() {
  const fromRequest = await requestUrl();
  if (fromRequest) return fromRequest;
  return configuredPublicUrl() || "http://localhost:3000";
}

/** Link que vai no e-mail: HTTPS público. Localhost cai no spam do Gmail. */
export async function mailAppUrl() {
  const publicUrl = configuredPublicUrl();
  if (publicUrl) return publicUrl;
  const fromRequest = await requestUrl();
  if (fromRequest && !isLocalHost(fromRequest)) return fromRequest;
  return fromRequest || "http://localhost:3000";
}
