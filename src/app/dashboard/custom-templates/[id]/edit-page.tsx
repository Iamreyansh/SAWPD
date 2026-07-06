"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TemplateBuilder } from "@/components/dashboard/template-builder";
import { updateCustomTemplateAction } from "@/app/dashboard/actions";
import type { CustomTemplate } from "@/types/custom-orders";

export default function EditTemplatePage({
  template,
}: {
  template: CustomTemplate;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/custom-templates"
        className="inline-flex items-center gap-1 text-[12px] text-ink/45 hover:text-ink transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        All templates
      </Link>

      <div>
        <p className="eyebrow mb-2">Edit Template</p>
        <h1 className="display-m text-ink">{template.name}</h1>
      </div>

      {error && (
        <div className="rounded-xl bg-vermillion/[0.06] border border-vermillion/20 p-3 text-[13px] text-vermillion">
          {error}
        </div>
      )}

      <TemplateBuilder
        initialName={template.name}
        initialDescription={template.description}
        initialImageUrl={template.imageUrl}
        initialBasePrice={template.basePrice}
        initialFields={template.fields}
        onSave={async (data) => {
          setError(null);
          startTransition(async () => {
            const result = await updateCustomTemplateAction(template.id, data);
            if (result.ok) {
              router.push("/dashboard/custom-templates");
              router.refresh();
            } else {
              setError(result.error);
            }
          });
        }}
        saveLabel="Save Changes"
        pending={pending}
      />
    </div>
  );
}
