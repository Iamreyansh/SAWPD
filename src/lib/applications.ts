import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Application, ApplicationInput } from "@/types/applications";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function listApplications(): Promise<Application[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Application[]) : [];
  } catch {
    return [];
  }
}

export async function getApplication(id: string): Promise<Application | null> {
  const all = await listApplications();
  return all.find((a) => a.id === id) ?? null;
}

export async function addApplication(
  input: ApplicationInput
): Promise<Application> {
  const all = await listApplications();
  const app: Application = {
    ...input,
    id: `app_${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  all.unshift(app);
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  return app;
}

export async function decideApplication(
  id: string,
  decision: "approved" | "rejected",
  reviewerNote: string
): Promise<Application | null> {
  const all = await listApplications();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const reviewedAt = new Date().toISOString();
  const trialEndsAt =
    decision === "approved"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
  const updated: Application = {
    ...all[idx],
    status: decision,
    reviewedAt,
    reviewerNote,
    trialEndsAt,
  };
  all[idx] = updated;
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  return updated;
}
