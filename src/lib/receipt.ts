const MAX_CHARS = 480_000;

export function parseReceiptDataUrl(value: string | null | undefined) {
  const data = String(value ?? "").trim();
  if (!data) return { url: null as string | null };
  if (!data.startsWith("data:image/")) {
    return { error: "Envie uma imagem (jpg, png ou webp)." };
  }
  if (data.length > MAX_CHARS) {
    return { error: "A foto ficou grande demais. Tente outra, mais leve." };
  }
  return { url: data };
}
