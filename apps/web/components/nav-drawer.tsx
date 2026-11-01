"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

const ITEMS: {
  href: string;
  label: string;
  soon?: boolean;
}[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop", soon: true },
  { href: "/partners", label: "Partners" },
  { href: "/news", label: "News" },
];

function DrawerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="3.75"
        y="3.75"
        width="16.5"
        height="16.5"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect x="5.5" y="5.5" width="4.25" height="13" rx="0.75" fill="currentColor" />
    </svg>
  );
}

export function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const panel =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200]">
            <button
              type="button"
              className="absolute inset-0 bg-[#0F1115]/45 backdrop-blur-[3px]"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <aside
              id={titleId}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              className="absolute inset-y-0 right-0 flex w-[min(100vw,300px)] flex-col border-l border-white/15 bg-[#141414] shadow-[-18px_0_48px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <Image
                  src="/brand-crown.png"
                  alt=""
                  width={36}
                  height={36}
                  className="h-8 w-8 object-contain"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/15 bg-[#0F1115] text-[#B5B5B5] transition hover:border-white/30 hover:text-white"
                  aria-label="Close menu"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path
                      d="M2 2l10 10M12 2 2 12"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1 bg-[#141414] px-3 py-4">
                {ITEMS.map((item) =>
                  item.soon ? (
                    <span
                      key={item.label}
                      className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-semibold text-[#7A7A7A]"
                      aria-disabled
                    >
                      {item.label}
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[#B5B5B5]">
                        SOON
                      </span>
                    </span>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/5 hover:text-[#C8FF2E]"
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </nav>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/10 bg-[#0A0A0A] text-white transition hover:border-white/25 hover:bg-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8FF2E]"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={titleId}
      >
        <DrawerIcon />
      </button>
      {panel}
    </>
  );
}
