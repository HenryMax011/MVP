"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const suggestions = [
  "Quanto gastei com mercado esse mês?",
  "Posso gastar R$200 esse fim de semana?",
  "Resumo da minha situação financeira",
  "Onde posso cortar gastos?",
];

type Msg = { role: "user" | "assistant"; content: string };

export function Chat({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function send(content: string) {
    const message = content.trim();
    if (!message || pending) return;
    setText("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setPending(true);
    try {
      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? data.error ?? "Não foi possível responder." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Falha de conexão. Tente de novo." }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col rounded-2xl border border-line bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="grid place-items-center gap-3 py-10 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Assistente financeiro</p>
              <p className="text-sm text-muted">Pergunte sobre seus gastos, contas e o que ainda sobra no mês.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line px-3 py-1.5 text-left text-xs hover:bg-foreground/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-primary text-primary-fg" : "bg-foreground/5"
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending && <p className="text-sm text-muted">Analisando seus dados...</p>}
        <div ref={bottom} />
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Pergunte sobre suas finanças..." />
        <Button type="submit" size="icon" disabled={pending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
