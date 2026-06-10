import { headers } from "next/headers";

function isPrivateIp(ip: string): boolean {
  // Check for private/loopback/link-local IPs that shouldn't be trusted from headers
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") || ip.startsWith("172.17.") || ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") || ip.startsWith("172.20.") || ip.startsWith("172.21.") ||
    ip.startsWith("172.22.") || ip.startsWith("172.23.") || ip.startsWith("172.24.") ||
    ip.startsWith("172.25.") || ip.startsWith("172.26.") || ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") || ip.startsWith("172.29.") || ip.startsWith("172.30.") ||
    ip.startsWith("172.31.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip === "0.0.0.0"
  );
}

/**
 * Extract the client IP from request headers.
 *
 * On Vercel, x-forwarded-for is set by the platform and is trustworthy.
 * On self-hosted deployments, validate that the IP is a public address
 * to prevent spoofing via client-set headers.
 * Falls back to "unknown" in dev or when headers are unavailable.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const isVercel = !!process.env.VERCEL;

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (isVercel || !isPrivateIp(ip)) return ip;
  }

  const real = h.get("x-real-ip");
  if (real) {
    const ip = real.trim();
    if (isVercel || !isPrivateIp(ip)) return ip;
  }

  return "unknown";
}
