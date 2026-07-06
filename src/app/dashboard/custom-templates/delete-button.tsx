"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteCustomTemplateAction } from "@/app/dashboard/actions";

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm("Delete this template? This cannot be undone.")) return;
        startTransition(async () => {
          const res = await deleteCustomTemplateAction(templateId);
          if (res.ok) router.refresh();
          else alert(res.error);
        });
      }}
      disabled={pending}
      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-ink/10 text-ink/30 hover:text-vermillion hover:border-vermillion/20"
      title="Delete template"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
