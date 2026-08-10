import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { deleteInquiry, updateInquiry } from "../actions";
import DeleteInquiryButton from "./delete-button";
import ActionForm from "../save-button";

export const dynamic = "force-dynamic";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  source: string;
  notes: string | null;
  created_at: string;
};

const STATUSES = ["new", "read", "replied", "archived"] as const;

export default async function InquiriesPage() {
  await requireAdmin();

  const { data, error } = await createServiceRoleClient()
    .from("inquiries")
    .select("id, name, email, message, status, source, notes, created_at")
    .order("created_at", { ascending: false });

  const inquiries = (data ?? []) as Inquiry[];

  return (
    <div>
      <h1 className="section-title mb-6 text-2xl">Inquiries</h1>

      {error && (
        <p role="alert" className="mb-6 text-sm text-[#ffb4b4]">
          Couldn&rsquo;t load inquiries: {error.message}
        </p>
      )}

      {inquiries.length === 0 && !error && (
        <p className="text-white/60">
          No inquiries yet. Messages sent through the contact form land here.
        </p>
      )}

      <ul className="space-y-4">
        {inquiries.map((inq) => (
          <li
            key={inq.id}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-5"
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="font-display text-lg font-semibold text-white">
                {inq.name}
              </h2>
              <a
                href={`mailto:${inq.email}?subject=Re:%20your%20inquiry`}
                className="text-sm text-gold underline-offset-4 hover:underline"
              >
                {inq.email}
              </a>
              <span className="ml-auto text-xs text-white/45">
                {new Date(inq.created_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            {inq.status === "new" && (
              <span className="mt-2 inline-block rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-gold">
                New
              </span>
            )}
            {inq.source !== "contact_form" && (
              <span className="mt-2 ml-2 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">
                {inq.source}
              </span>
            )}

            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-[0.95rem] leading-relaxed text-white/90">
              {inq.message}
            </p>

            <ActionForm action={updateInquiry} label="Save" className="mt-4">
              <input type="hidden" name="id" value={inq.id} />
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label
                    htmlFor={`status-${inq.id}`}
                    className="mb-1.5 block text-xs uppercase tracking-wide text-white/50"
                  >
                    Status
                  </label>
                  <select
                    id={`status-${inq.id}`}
                    name="status"
                    defaultValue={inq.status}
                    className="rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[240px] flex-1">
                  <label
                    htmlFor={`notes-${inq.id}`}
                    className="mb-1.5 block text-xs uppercase tracking-wide text-white/50"
                  >
                    Private notes
                  </label>
                  <input
                    id={`notes-${inq.id}`}
                    name="notes"
                    defaultValue={inq.notes ?? ""}
                    placeholder="Quoted $X, follow up Friday…"
                    className="w-full rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white placeholder:text-white/35"
                  />
                </div>
              </div>
            </ActionForm>

            <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
              <DeleteInquiryButton
                id={inq.id}
                name={inq.name}
                action={deleteInquiry}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
