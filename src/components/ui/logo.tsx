import Link from "next/link";

export function Logo({
  size = "default",
  href = "/",
  invert = false,
}: {
  size?: "default" | "large";
  href?: string;
  invert?: boolean;
}) {
  const dims = size === "large" ? "h-10 w-auto" : "h-7 w-auto";
  const wrapper = (
    <span className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="SAWPD"
        className={dims}
        style={invert ? { filter: "invert(1)" } : undefined}
      />
    </span>
  );
  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {wrapper}
      </Link>
    );
  }
  return wrapper;
}
