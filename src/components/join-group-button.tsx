"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { joinGroupByCode } from "@/actions/groups";
import { Button } from "@/components/ui/button";

export function JoinGroupButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await joinGroupByCode(code);
        setPending(false);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.id) router.push(`/grupos/${result.id}`);
      }}
    >
      {pending ? "Entrando..." : "Entrar no grupo"}
    </Button>
  );
}
