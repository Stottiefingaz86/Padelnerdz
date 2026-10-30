"use client";

import { useState } from "react";

import type { AdminUser } from "@/lib/users";

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportUsersButton({ users }: { users: AdminUser[] }) {
  const [busy, setBusy] = useState(false);

  function download(kind: "all" | "phones") {
    setBusy(true);
    try {
      const rows =
        kind === "phones"
          ? users.filter((u) => Boolean(u.phoneE164))
          : users;

      const header = ["display_name", "phone_e164", "country", "user_id", "joined_at"];
      const lines = [
        header.join(","),
        ...rows.map((u) =>
          [
            csvEscape(u.displayName),
            csvEscape(u.phoneE164),
            csvEscape(u.countryLabel),
            csvEscape(u.id),
            csvEscape(u.createdAt),
          ].join(","),
        ),
      ];

      const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download =
        kind === "phones"
          ? `padel-nerdz-phones-${stamp}.csv`
          : `padel-nerdz-users-${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  const withPhone = users.filter((u) => Boolean(u.phoneE164)).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy || users.length === 0}
        onClick={() => download("all")}
        className="rounded-full border border-[#2E2E2E] bg-[#141414] px-4 py-2 text-sm text-white hover:border-[#C8FF2E]/40 disabled:opacity-40"
      >
        Export all CSV
      </button>
      <button
        type="button"
        disabled={busy || withPhone === 0}
        onClick={() => download("phones")}
        className="rounded-full border border-[#C8FF2E]/35 bg-[#C8FF2E]/10 px-4 py-2 text-sm font-medium text-[#C8FF2E] hover:bg-[#C8FF2E]/15 disabled:opacity-40"
      >
        Export phones ({withPhone}) · SMS
      </button>
    </div>
  );
}
