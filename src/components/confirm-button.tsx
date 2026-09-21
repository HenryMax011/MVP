"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ConfirmButton({
  label,
  pendingLabel,
  variant = "secondary",
  size = "sm",
  action,
}: {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
  action: () => Promise<{ error?: string; success?: boolean; id?: string; transactionId?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size={size}
      variant={variant}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await action();
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? pendingLabel ?? "..." : label}
    </Button>
  );
}
