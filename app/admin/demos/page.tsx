import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { createDemo, deleteDemo, reorderDemos, updateDemo } from "../actions";
import ConfirmButton from "../confirm-button";
import FileField from "../file-field";
import ActionForm from "../save-button";
import SortableList from "../sortable-list";
import {
  Badge,
  Card,
  Checkbox,
  Chevron,
  EmptyState,
  ErrorNote,
  Field,
  PageHeader,
  Row,
  RowSummary,
  inputClass,
} from "../ui";

export const dynamic = "force-dynamic";

type DemoRow = {
  id: string;
  title: string;
  title_secondary: string | null;
  subtitle: string | null;
  audio_url: string;
  duration_seconds: number | null;
  sort_order: number;
  published: boolean;
};

function mmss(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default async function DemosAdminPage() {
  await requireAdmin();

  const { data, error } = await createServiceRoleClient()
    .from("demos")
    .select(
      "id, title, title_secondary, subtitle, audio_url, duration_seconds, sort_order, published"
    )
    .order("sort_order", { ascending: true });

  const demos = (data ?? []) as DemoRow[];
  const live = demos.filter((d) => d.published).length;

  return (
    <div>
      <PageHeader
        title="Demos"
        count={`${demos.length} total · ${live} on the site`}
      >
        Unpublishing keeps a recording here without listing it publicly. Drag to
        change the order they appear in.
      </PageHeader>

      {error && <ErrorNote>Couldn&rsquo;t load demos: {error.message}</ErrorNote>}

      <details className="group mb-5">
        <Card tone="accent">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-bold text-gold [&::-webkit-details-marker]:hidden">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-gold/50 text-base leading-none">
              +
            </span>
            Add a demo
            <Chevron />
          </summary>

          <div className="border-t border-gold/20 p-4">
            <ActionForm
              action={createDemo}
              label="Add demo"
              successMessage="Demo added."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" htmlFor="new-demo-title" required>
                  <input
                    id="new-demo-title"
                    name="title"
                    required
                    placeholder="Narrative Voice"
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Second line"
                  htmlFor="new-demo-secondary"
                  hint="The accent or register, shown in gold."
                >
                  <input
                    id="new-demo-secondary"
                    name="title_secondary"
                    placeholder="Russian Accent"
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Subtitle"
                  htmlFor="new-demo-subtitle"
                  hint="POV or category. Line breaks are kept."
                  className="sm:col-span-2"
                >
                  <textarea
                    id="new-demo-subtitle"
                    name="subtitle"
                    rows={2}
                    placeholder="Dialect Work"
                    className={inputClass}
                  />
                </Field>
                <Field label="Recording" className="sm:col-span-2" required>
                  <FileField
                    kind="demo"
                    name="audio_upload"
                    durationName="audio_duration"
                    title="demo"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Checkbox name="published" defaultChecked label="Publish immediately" />
                </div>
              </div>
            </ActionForm>
          </div>
        </Card>
      </details>

      {demos.length === 0 && !error && (
        <EmptyState title="No demos yet">
          Add one above — the length is read from the file as it uploads.
        </EmptyState>
      )}

      <SortableList
        ids={demos.map((d) => d.id)}
        action={reorderDemos}
        grid
        noun="demos"
        search={Object.fromEntries(
          demos.map((d) => [
            d.id,
            [d.title, d.title_secondary, d.subtitle].filter(Boolean).join(" "),
          ])
        )}
        flag={{ label: "Hidden", ids: demos.filter((d) => !d.published).map((d) => d.id) }}
      >
        {demos.map((demo) => (
          <div key={demo.id}>
            <Row>
              <RowSummary>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold leading-tight text-white">
                    {[demo.title, demo.title_secondary].filter(Boolean).join(" — ")}
                  </p>
                  {/* The subtitle can hold a newline; flattened here so every
                      collapsed row is the same height. */}
                  <p className="truncate text-xs leading-tight text-white/40">
                    {demo.subtitle?.replace(/\n/g, " · ") || "No subtitle"}
                  </p>
                </div>
                {!demo.published && <Badge>Hidden</Badge>}
                <span className="shrink-0 font-mono text-xs tabular-nums text-white/35">
                  {mmss(demo.duration_seconds)}
                </span>
                <Chevron />
              </RowSummary>

              <div className="border-t border-white/[0.07] p-4">
                {/*
                  preload="metadata" so the control shows the real length as
                  soon as it renders. The public player uses preload="none"
                  because most visitors never press play; here, listening is
                  the entire reason to open the row.
                */}
                <audio
                  controls
                  preload="metadata"
                  src={demo.audio_url}
                  className="mb-4 h-9 w-full"
                />

                <ActionForm
                  action={updateDemo}
                  label="Save"
                  successMessage={`Saved ${demo.title}.`}
                >
                  <input type="hidden" name="id" value={demo.id} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Title" htmlFor={`title-${demo.id}`} required>
                      <input
                        id={`title-${demo.id}`}
                        name="title"
                        required
                        defaultValue={demo.title}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Second line" htmlFor={`second-${demo.id}`}>
                      <input
                        id={`second-${demo.id}`}
                        name="title_secondary"
                        defaultValue={demo.title_secondary ?? ""}
                        className={inputClass}
                      />
                    </Field>
                    <Field
                      label="Subtitle"
                      htmlFor={`sub-${demo.id}`}
                      hint="A textarea because line breaks are meaningful here."
                      className="sm:col-span-2"
                    >
                      <textarea
                        id={`sub-${demo.id}`}
                        name="subtitle"
                        rows={2}
                        defaultValue={demo.subtitle ?? ""}
                        className={inputClass}
                      />
                    </Field>
                    <Field
                      label="Replace the recording"
                      hint="Optional — leave it alone to keep the current audio."
                      className="sm:col-span-2"
                    >
                      <FileField
                        kind="demo"
                        name="audio_upload"
                        durationName="audio_duration"
                        title={demo.title}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Checkbox
                        name="published"
                        defaultChecked={demo.published}
                        label="Published"
                      />
                    </div>
                  </div>
                </ActionForm>

                <div className="mt-4 flex justify-end border-t border-white/[0.07] pt-3">
                  <ConfirmButton
                    id={demo.id}
                    action={deleteDemo}
                    what={[demo.title, demo.title_secondary].filter(Boolean).join(" — ")}
                    instead="Untick Published"
                  />
                </div>
              </div>
            </Row>
          </div>
        ))}
      </SortableList>
    </div>
  );
}
