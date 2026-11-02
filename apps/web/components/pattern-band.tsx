"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type Props = {
  title: string;
  body: string;
};

/**
 * Brand wallpaper. Tile asset is 1024×512 (Mixy half-drop).
 * Use a fixed width (not 100vw) so CSS repeat actually tiles.
 */
export function BrandWallpaper({
  opacity = 0.7,
  parallax = false,
  /** CSS length for one tile width, height follows aspect */
  tile = "360px",
}: {
  opacity?: number;
  parallax?: boolean;
  tile?: string;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parallax) return;
    const layer = layerRef.current;
    const host = hostRef.current;
    if (!layer || !host) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = host.parentElement;
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const view = window.innerHeight || 1;
        const progress = (view / 2 - (rect.top + rect.height / 2)) / view;
        const y = Math.max(-36, Math.min(36, progress * 64));
        layer.style.transform = `translate3d(0, ${y}px, 0)`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [parallax]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        ref={layerRef}
        className="absolute -inset-[20%] will-change-transform"
        style={{
          backgroundColor: "#0F1115",
          backgroundImage: "url(/brand-pattern.png)",
          backgroundSize: tile,
          backgroundRepeat: "repeat",
          backgroundPosition: "0 0",
          opacity,
        }}
      />
      {/* Soft center fade so copy stays readable over the tile */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 42%, rgba(15,17,21,0.82) 0%, rgba(15,17,21,0.35) 48%, transparent 78%), linear-gradient(180deg, rgba(15,17,21,0.55) 0%, transparent 22%, transparent 78%, rgba(15,17,21,0.7) 100%)",
        }}
      />
    </div>
  );
}

export function BrandSection({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative border-y border-[#222] bg-[#0F1115] ${className}`}
    >
      {children}
    </section>
  );
}

/** Crown highlight band, solid ink, no wallpaper. */
export function PatternBand({ title, body }: Props) {
  return (
    <section className="border-y border-[#222] bg-[#0F1115]">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center sm:px-10 sm:py-28">
        <Image
          src="/brand-crown.png"
          alt=""
          width={160}
          height={160}
          className="mb-5 h-14 w-14 object-contain mix-blend-screen sm:h-16 sm:w-16"
          aria-hidden
        />
        <h2 className="land-display text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl md:text-[2.75rem]">
          {title}
        </h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-[#B5B5B5]">
          {body}
        </p>
      </div>
    </section>
  );
}
