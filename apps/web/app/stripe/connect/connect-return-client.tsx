'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  groupId: string;
  stripe: 'return' | 'refresh';
};

export function ConnectReturnClient({ groupId, stripe }: Props) {
  const [tried, setTried] = useState(false);

  const deepLink = useMemo(() => {
    if (!groupId) return null;
    return `padelnerdz://group/${encodeURIComponent(groupId)}/payments?stripe=${stripe}`;
  }, [groupId, stripe]);

  useEffect(() => {
    if (!deepLink) return;
    setTried(true);
    window.location.href = deepLink;
  }, [deepLink]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F1115] px-6 py-16 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 600px at 10% -10%, rgba(200,255,46,0.16), transparent 55%), radial-gradient(900px 500px at 110% 10%, rgba(103,232,249,0.08), transparent 50%)',
        }}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#14171C]/[0.92] p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#C8FF2E] text-[22px] font-extrabold tracking-tight text-[#0F1115]">
          PN
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C8FF2E]">
          Padel Nerdz
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
          {stripe === 'refresh' ? 'Continue payout setup' : 'You’re back'}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#B5B5B5]">
          {groupId
            ? tried
              ? 'Opening Padel Nerdz… If nothing happens, tap below.'
              : 'Returning you to unlock mix-in payouts…'
            : 'Missing group — open Payouts from Admin in the app.'}
        </p>

        {deepLink ? (
          <a
            href={deepLink}
            className="mt-8 inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-[#C8FF2E] px-6 text-base font-extrabold text-[#0F1115]"
          >
            Open Padel Nerdz
          </a>
        ) : null}

        <div className="mt-6">
          <Link href="/" className="text-sm text-[#7A7A7A] underline-offset-2 hover:underline">
            padelnerdz.com
          </Link>
        </div>
      </div>
    </main>
  );
}
