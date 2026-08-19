import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { deleteInquiry, updateInquiry } from "../actions";
import ConfirmButton from "../confirm-button";
import ActionForm from "../save-button";
import { Badge, Card, EmptyState, ErrorNote, Field, PageHeader, inputClass } from "../ui";

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
  const unread = inquiries.filter((i) => i.status === "new").length;

  return (
    <div>
      <PageHeader
        title="Inquiries"
        count={`${inquiries.length} total${unread ? ` · ${unread} unread` : ""}`}
      >
        Everything sent through the contact form. Each one is emailed to you as
        it arrives; this is the durable copy.
      </PageHeader>

      {error && <ErrorNote>Couldn&rsquo;t load inquiries: {error.message}</ErrorNote>}

      {inquiries.length === 0 && !error && (
        <EmptyState title="No inquiries yet">
          Messages sent through the contact form land here, and are emailed to
          you at the same time.
        </EmptyState>
      )}

      <ul className="space-y-3">
        {inquiries.map((inq) => (
          <li key={inq.id}>
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="font-display text-lg font-semibold text-white">
                  {inq.name}
                </h2>
                {inq.status === "new" && <Badge tone="gold">New</Badge>}
                {inq.source !== "contact_form" && (
                  <Badge tone="warn" title="Caught by the honeypot">
                    {inq.source.replace("contact_form_", "")}
                  </Badge>
                )}
                <span className="ml-auto font-mono text-xs text-white/30">
                  {new Date(inq.created_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <a
                href={`mailto:${inq.email}?subject=Re:%20your%20inquiry`}
                className="mt-1 inline-block text-sm text-gold underline-offset-4 hover:underline"
              >
                {inq.email}
              </a>

              <blockquote className="mt-4 whitespace-pre-wrap rounded-lg border-l-2 border-gold/35 bg-black/25 px-4 py-3.5 text-[0.95rem] leading-relaxed text-white/85">
                {inq.message}
              </blockquote>

              <ActionForm
                action={updateInquiry}
                label="Save"
                successMessage={`Updated the inquiry from ${inq.name}.`}
                className="mt-4"
              >
                <input type="hidden" name="id" value={inq.id} />
                <div className="flex flex-wrap items-start gap-4">
                  <Field label="Status" htmlFor={`status-${inq.id}`}>
                    <select
                      id={`status-${inq.id}`}
                      name="status"
                      defaultValue={inq.status}
                      className={inputClass}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Private notes"
                    htmlFor={`notes-${inq.id}`}
                    className="min-w-[240px] flex-1"
                  >
                    <input
                      id={`notes-${inq.id}`}
                      name="notes"
                      defaultValue={inq.notes ?? ""}
                      placeholder="Quoted $X, follow up Friday…"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </ActionForm>

              <div className="mt-4 flex justify-end border-t border-white/[0.07] pt-3">
                <ConfirmButton
                  id={inq.id}
                  action={deleteInquiry}
                  what={`the inquiry from ${inq.name}`}
                  instead="Set the status to archived"
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
