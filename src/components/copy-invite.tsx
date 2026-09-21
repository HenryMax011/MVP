"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyInvite({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p className="rounded-lg bg-foreground/5 px-3 py-1 font-mono text-sm">{code}</p>
      <Button size="sm" variant="outline" onClick={() => copy(url)}>
        {copied ? "Link copiado" : "Copiar link"}
      </Button>
    </div>
  );
}
