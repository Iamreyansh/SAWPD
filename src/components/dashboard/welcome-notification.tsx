"use client";

import { useState, useEffect } from "react";
import { X, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "sawpd.welcomeDismissed";

export function WelcomeNotification({ storeName }: { storeName: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (!dismissed) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-vermillion/20 bg-vermillion/[0.04] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-vermillion/10">
          <PartyPopper className="h-4.5 w-4.5 text-vermillion" strokeWidth={2} />
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-ink">
            Welcome to SAWPD, {storeName}!
          </p>
          <p className="mt-1 text-[13px] text-ink/60">
            Your shop is now live. Add products, set your UPI, and share your
            shop link to start selling.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="vermillion">
              <a href="/dashboard/products">Add your first product</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="/dashboard/settings">Set up your shop</a>
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 rounded-lg p-1 text-ink/40 transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
