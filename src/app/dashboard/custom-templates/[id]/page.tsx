import { notFound, redirect } from "next/navigation";
import { requireActiveStore } from "@/lib/seller-auth";
import { getTemplateForStore } from "@/lib/custom-templates";
import EditTemplatePage from "./edit-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const store = await requireActiveStore();
  const { id } = await params;
  const template = await getTemplateForStore(id, store.slug);
  if (!template) return { title: "Template Not Found" };
  return { title: `Edit ${template.name} · Templates` };
}

export default async function EditTemplateServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    redirect("/dashboard/settings?feature=custom_orders");
  }
  const { id } = await params;
  const template = await getTemplateForStore(id, store.slug);

  if (!template) {
    notFound();
  }

  return <EditTemplatePage template={template} />;
}