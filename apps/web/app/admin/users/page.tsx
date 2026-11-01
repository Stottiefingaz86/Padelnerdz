import Link from "next/link";
import { redirect } from "next/navigation";

import { isAdminAuthed } from "@/lib/admin-auth";
import { getAdminUsers } from "@/lib/users";
import { LogoutButton } from "../logout-button";
import { ExportUsersButton } from "./export-button";

export const metadata = { title: "Admin · Users" };

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const { users, note, error } = await getAdminUsers();

  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C8FF2E]">
              Padel Nerdz · Owner
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">Users</h1>
            <p className="mt-2 text-sm text-[#B5B5B5]">
              {users.length} live account{users.length === 1 ? "" : "s"} · phones
              from Supabase profiles only · export for SMS campaigns
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ExportUsersButton users={users} />
            <Link
              href="/admin"
              className="rounded-full border border-[#2E2E2E] px-4 py-2 text-sm text-[#B5B5B5] hover:text-white"
            >
              Metrics
            </Link>
            <LogoutButton />
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-[#FF6E6E]/35 bg-[#FF6E6E]/10 px-4 py-3 text-sm text-[#FFB4B4]">
            {error}
          </div>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#2E2E2E]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#141414] text-[#7A7A7A]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[#7A7A7A]"
                  >
                    No live users to show.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-[#222]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover bg-[#1A1A1A]"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C8FF2E] text-sm font-bold text-[#0F1115]">
                            {u.initials}
                          </div>
                        )}
                        <span className="font-medium text-white">
                          {u.displayName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#B5B5B5]">{u.countryLabel}</td>
                    <td className="px-4 py-3 font-mono text-[#C8FF2E]">
                      {u.phoneDisplay}
                    </td>
                    <td className="px-4 py-3 text-[#7A7A7A]">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[#7A7A7A]">{note}</p>
      </div>
    </main>
  );
}
