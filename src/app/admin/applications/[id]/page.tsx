import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getApplication } from "@/lib/applications";
import { StatusBadge } from "@/components/admin/status-badge";
import { DecisionPanel } from "./decision-panel";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;
  const app = await getApplication(id);
  if (!app) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/admin/applications"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
        >
          ← All applications
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display-m text-ink">{app.storeName}</h1>
          <StatusBadge status={app.status} />
        </div>
        <p className="mt-2 text-[14px] text-ink/60">
          {app.fullName} ·{" "}
          <a
            href={`https://instagram.com/${app.instagramHandle}`}
            target="_blank"
            rel="noreferrer"
            className="text-ink underline underline-offset-4 hover:text-vermillion"
          >
            @{app.instagramHandle}
          </a>{" "}
          · {app.email}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-bone p-5">
          <p className="eyebrow-ink">Followers</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
            {app.followerCount.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-bone p-5">
          <p className="eyebrow-ink">Sales volume</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
            {app.salesCount}
            <span className="ml-1 text-[14px] font-medium text-ink/55">
              / {app.salesCadence.replace("ly", "")}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-bone p-5">
          <p className="eyebrow-ink">Avg order value</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
            {formatINR(app.averageOrderValue)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-ink/10 bg-bone p-6">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Top products
        </h2>
        <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">
          {app.topProducts}
        </p>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-bone p-6">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Current setup
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink">
          {app.currentSetup}
        </p>
        {app.websiteUrl && (
          <p className="mt-4 text-[13.5px]">
            <span className="text-ink/50">Website: </span>
            <a
              href={app.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-ink underline underline-offset-4 hover:text-vermillion"
            >
              {app.websiteUrl}
            </a>
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-bone p-6">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Why they want to join
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink">
          {app.motivation}
        </p>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-bone p-6 text-[13.5px] text-ink/65">
        <p>
          <span className="text-ink/45">Phone: </span>
          <a href={`tel:${app.phone}`} className="text-ink hover:underline">
            {app.phone}
          </a>
        </p>
        <p className="mt-1">
          <span className="text-ink/45">Heard about us via: </span>
          <span className="text-ink">{app.referralSource}</span>
        </p>
        <p className="mt-1">
          <span className="text-ink/45">Niche: </span>
          <span className="capitalize text-ink">{app.niche}</span>
        </p>
        <p className="mt-1">
          <span className="text-ink/45">Applied: </span>
          <span className="text-ink">
            {new Date(app.createdAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </p>
      </section>

      {app.status === "pending" ? (
        <DecisionPanel applicationId={app.id} />
      ) : (
        <section className="rounded-2xl border border-ink/10 bg-bone p-6">
          <p className="eyebrow-ink mb-2">
            Reviewed {app.reviewedAt && new Date(app.reviewedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          {app.trialEndsAt && (
            <p className="text-[14px] text-ink">
              Trial ends{" "}
              <span className="font-semibold">
                {new Date(app.trialEndsAt).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </span>
            </p>
          )}
          {app.reviewerNote && (
            <p className="mt-3 text-[14px] text-ink/70">
              <span className="text-ink/45">Note: </span>
              {app.reviewerNote}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
