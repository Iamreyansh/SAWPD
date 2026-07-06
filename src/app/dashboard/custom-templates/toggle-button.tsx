"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toggleCustomTemplateActiveAction } from "@/app/dashboard/actions";

export function ToggleTemplateButton({
  templateId,
  isActive,
}: {
  templateId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await toggleCustomTemplateActiveAction(templateId);
          if (result.ok) router.refresh();
        })
      }
      disabled={pending}
      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-ink/10 text-ink/50 hover:bg-ink/[0.04]"
      title={isActive ? "Deactivate" : "Activate"}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isActive ? (
        <EyeOff className="h-3.5 w-3.5" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
