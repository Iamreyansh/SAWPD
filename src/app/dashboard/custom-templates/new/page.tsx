"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TemplateBuilder } from "@/components/dashboard/template-builder";
import { createCustomTemplateAction } from "@/app/dashboard/actions";

export default function NewTemplatePage() {
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
        <p className="eyebrow mb-2">New Template</p>
        <h1 className="display-m text-ink">Create Custom Order Form</h1>
        <p className="text-[13px] text-ink/55 mt-1">
          Build a form your customers will fill out. Each field can have a price.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-vermillion/[0.06] border border-vermillion/20 p-3 text-[13px] text-vermillion">
          {error}
        </div>
      )}

      <TemplateBuilder
        onSave={async (data) => {
          setError(null);
          startTransition(async () => {
            const result = await createCustomTemplateAction(data);
            if (result.ok) {
              router.push("/dashboard/custom-templates");
              router.refresh();
            } else {
              setError(result.error);
            }
          });
        }}
        saveLabel="Create Template"
        pending={pending}
      />
    </div>
  );
}
