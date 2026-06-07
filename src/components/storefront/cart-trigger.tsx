"use client";

import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCartStore, selectCount } from "@/store/cart-store";
import { useUiStore } from "@/store/ui-store";
import { useHasMounted } from "@/hooks/use-has-mounted";

export function CartTrigger() {
  const count = useCartStore(selectCount);
  const hydrated = useCartStore((s) => s.hydrated);
  const openCart = useUiStore((s) => s.openCart);
  const mounted = useHasMounted();

  const display = mounted && hydrated ? count : 0;

  return (
    <button
      onClick={openCart}
      className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-bone transition-all hover:border-ink/30 active:scale-95"
      aria-label={`Open cart (${display} items)`}
    >
      <ShoppingBag
        className="h-[18px] w-[18px] text-ink transition-transform group-hover:-translate-y-0.5"
        strokeWidth={1.75}
      />
      {display > 0 && (
        <motion.span
          key={display}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vermillion px-1 text-[10px] font-bold leading-none text-bone"
        >
          {display}
        </motion.span>
      )}
    </button>
  );
}
