"use client";

import { useState } from "react";
import { toast } from "sonner";
import { compressImageToDataUrl } from "@/lib/compress-image";

export function ReceiptInput({ defaultUrl }: { defaultUrl?: string | null }) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const removed = Boolean(defaultUrl) && !url;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma foto (jpg, png ou webp).");
      return;
    }
    setBusy(true);
    try {
      setUrl(await compressImageToDataUrl(file));
    } catch {
      toast.error("A foto ficou grande demais. Tente outra, mais leve.");
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="receiptUrl" value={url} />
      {removed ? <input type="hidden" name="removeReceipt" value="on" /> : null}
      {url ? (
        <img src={url} alt="Comprovante" className="h-24 w-auto rounded-xl border border-line object-cover" />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-line px-3 text-sm hover:border-primary">
          <input type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={busy} />
          {busy ? "Comprimindo..." : url ? "Trocar foto" : "Foto do comprovante"}
        </label>
        {url ? (
          <button type="button" className="text-xs text-muted hover:text-foreground" onClick={() => setUrl("")}>
            Tirar foto
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted">Opcional. A foto é comprimida e fica no lançamento.</p>
    </div>
  );
}
