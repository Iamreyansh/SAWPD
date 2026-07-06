import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStore } from "@/lib/store";
import { getTemplateForStore } from "@/lib/custom-templates";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/footer";
import { CustomerCustomOrderForm } from "@/components/storefront/customer-custom-order-form";
import { formatINR } from "@/lib/utils";
import type { Store } from "@/types/storefront";
import type { SellerStore } from "@/types/seller";

type Params = { slug: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, id } = await params;
  const store = await getStore(slug);
  const template = await getTemplateForStore(id, slug);
  if (!store || !template) return { title: "Not Found" };
  return {
    title: `${template.name} · ${store.name}`,
    description: template.description,
  };
}

export default async function CustomOrderDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, id } = await params;
  const store = await getStore(slug);
  if (!store || !store.customOrdersEnabled) notFound();
  const template = await getTemplateForStore(id, slug);
  if (!template) notFound();

  // Cast through SellerStore so the footer accepts the shape (Store has the same fields).
  const storeForFooter = store as SellerStore;

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader store={store as Store} />
      <main className="flex-1 container-editorial py-8 md:py-12">
        <Link
          href={`/s/${slug}/custom`}
          className="inline-flex items-center gap-1 text-[12px] text-ink/45 hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" />
          All custom orders
        </Link>

        <div className="mb-8">
          <p className="eyebrow mb-2">Custom order</p>
          <h1 className="display-m text-ink">{template.name}</h1>
          {template.description && (
            <p className="mt-3 text-[15px] text-ink/60 max-w-2xl">
              {template.description}
            </p>
          )}
          <p className="mt-4 text-[13px] text-ink/50">
            Starts at {formatINR(template.basePrice)}
          </p>
        </div>

        <CustomerCustomOrderForm
          template={template}
          storeSlug={slug}
        />
      </main>
      <StorefrontFooter store={store as Store} stats={null} />
    </div>
  );
}