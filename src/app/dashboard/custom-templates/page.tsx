import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveStore } from "@/lib/seller-auth";
import { listTemplatesForStore } from "@/lib/custom-templates";
import { Plus } from "lucide-react";
import { ToggleTemplateButton } from "./toggle-button";
import { DeleteTemplateButton } from "./delete-button";

export const metadata = {
  title: "Dashboard · Custom Templates",
  description: "Manage custom-order templates your customers can fill in.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CustomTemplatesPage() {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    redirect("/dashboard/settings?feature=custom_orders");
  }
  const templates = await listTemplatesForStore(store.slug);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Custom Orders</p>
          <h1 className="display-m text-ink">Templates</h1>
          <p className="text-[13px] text-ink/55 mt-1">
            {templates.length} template{templates.length === 1 ? "" : "s"} ·{" "}
            {templates.filter((t) => t.isActive).length} active
          </p>
        </div>
        <Link
          href="/dashboard/custom-templates/new"
          className="inline-flex h-9 items-center justify-center rounded-full bg-vermillion px-4 text-[12.5px] font-semibold text-bone hover:bg-vermillion-deep shadow-glow"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Template
        </Link>
      </header>

      {templates.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-ink/15">
          <p className="text-[15px] text-ink/55">No templates yet.</p>
          <p className="text-[13px] text-ink/40 mt-1">
            Create your first custom order template to start taking custom
            orders.
          </p>
          <Link
            href="/dashboard/custom-templates/new"
            className="inline-flex mt-4 text-[13px] font-semibold text-vermillion hover:text-vermillion-deep"
          >
            Create template →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={
                "rounded-2xl border bg-white overflow-hidden transition-all " +
                (template.isActive
                  ? "border-ink/10 hover:shadow-md"
                  : "border-ink/5 opacity-60")
              }
            >
              {template.imageUrl && (
                <div className="aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-ink truncate">
                      {template.name}
                    </h3>
                    <p className="text-[11px] text-ink/45 mt-0.5">
                      {template.fields.length} fields · Base ₹
                      {template.basePrice}
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                      (template.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-50 text-gray-500")
                    }
                  >
                    {template.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/custom-templates/${template.id}`}
                    className="flex-1 inline-flex h-8 items-center justify-center rounded-lg border border-ink/10 text-[11px] font-medium text-ink/60 hover:bg-ink/[0.02]"
                  >
                    Edit
                  </Link>
                  <ToggleTemplateButton
                    templateId={template.id}
                    isActive={template.isActive}
                  />
                  <DeleteTemplateButton templateId={template.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}