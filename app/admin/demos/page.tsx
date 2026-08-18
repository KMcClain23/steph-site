import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { createDemo, deleteDemo, reorderDemos, updateDemo } from "../actions";
import ActionForm from "../save-button";
import DeleteDemoButton from "./delete-button";
import SortableList from "../sortable-list";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  title_secondary: string | null;
  subtitle: string | null;
  audio_url: string;
  duration_seconds: number | null;
  sort_order: number;
  published: boolean;
};

const field =
  "w-full rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white placeholder:text-white/35";
const labelCls = "mb-1.5 block text-xs uppercase tracking-wide text-white/50";
const fileCls =
  "w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-gold/20 file:px-3 file:py-2 file:text-sm file:font-bold file:text-gold hover:file:bg-gold/30";

function mmss(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-white/40 transition-transform group-open:rotate-180"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default async function DemosAdminPage() {
  await requireAdmin();

  const { data, error } = await createServiceRoleClient()
    .from("demos")
    .select(
      "id, title, title_secondary, subtitle, audio_url, duration_seconds, sort_order, published"
    )
    .order("sort_order", { ascending: true });

  const demos = (data ?? []) as Row[];
  const live = demos.filter((d) => d.published).length;

  return (
    <div>
      <h1 className="section-title mb-2 text-2xl">Demos</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
        {demos.length} demos, {live} showing on the site. Unpublishing keeps a
        recording here without listing it publicly.
      </p>

      {error && (
        <p role="alert" className="mb-6 text-sm text-[#ffb4b4]">
          Couldn&rsquo;t load demos: {error.message}
        </p>
      )}

      <details className="group mb-6 rounded-xl border border-gold/25 bg-gold/[0.05]">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-bold text-gold [&::-webkit-details-marker]:hidden">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-gold/50 text-base leading-none">
            +
          </span>
          Add a demo
          <Chevron />
        </summary>

        <div className="border-t border-gold/20 p-4">
          <ActionForm action={createDemo} label="Upload demo">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="new-demo-title">
                  Title <span className="text-gold">*</span>
                </label>
                <input
                  id="new-demo-title"
                  name="title"
                  required
                  placeholder="Narrative Voice"
                  className={field}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="new-demo-secondary">
                  Second line
                </label>
                <input
                  id="new-demo-secondary"
                  name="title_secondary"
                  placeholder="Russian Accent"
                  className={field}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="new-demo-subtitle">
                  Subtitle
                </label>
                <textarea
                  id="new-demo-subtitle"
                  name="subtitle"
                  rows={2}
                  placeholder={"Dialect Work"}
                  className={field}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked
                  className="h-4 w-4 accent-[#c48b36]"
                />
                Publish immediately
              </label>
            </div>
          </ActionForm>
        </div>
      </details>

      {/* Two columns on wide screens — the cards are short, so a single
          column left most of the page empty and made reordering a scroll. */}
      <SortableList ids={demos.map((d) => d.id)} action={reorderDemos} grid>
        {demos.map((demo) => (
          <div key={demo.id}>
            <details className="group rounded-xl border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20 open:border-gold/30 open:bg-white/[0.06]">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold leading-tight text-white">
                    {[demo.title, demo.title_secondary].filter(Boolean).join(" — ")}
                  </p>
                  {/* The subtitle can hold a newline; keep it to one line here
                      so every collapsed row is the same height. */}
                  <p className="truncate text-xs leading-tight text-white/45">
                    {demo.subtitle?.replace(/\n/g, " · ") || "No subtitle"}
                  </p>
                </div>

                {!demo.published && (
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white/50">
                    Hidden
                  </span>
                )}
                <span className="shrink-0 font-mono text-xs tabular-nums text-white/40">
                  {mmss(demo.duration_seconds)}
                </span>
                <Chevron />
              </summary>

              <div className="border-t border-white/10 p-4">
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

                <ActionForm action={updateDemo} label="Save">
                  <input type="hidden" name="id" value={demo.id} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls} htmlFor={`title-${demo.id}`}>
                        Title
                      </label>
                      <input
                        id={`title-${demo.id}`}
                        name="title"
                        required
                        defaultValue={demo.title}
                        className={field}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`second-${demo.id}`}>
                        Second line
                      </label>
                      <input
                        id={`second-${demo.id}`}
                        name="title_secondary"
                        defaultValue={demo.title_secondary ?? ""}
                        className={field}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`sub-${demo.id}`}>
                        Subtitle
                      </label>
                      {/*
                        A textarea, not an input. One subtitle is genuinely two
                        lines — "1st Person POV" / "American" — and the public
                        card renders it with whitespace-pre-line. An <input>
                        can't hold a newline, so editing that demo in one would
                        have silently flattened it to "1st Person POVAmerican"
                        the first time the row was saved.
                      */}
                      <textarea
                        id={`sub-${demo.id}`}
                        name="subtitle"
                        rows={2}
                        defaultValue={demo.subtitle ?? ""}
                        className={field}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls} htmlFor={`audio-${demo.id}`}>
                        Replace the recording
                      </label>
                      <input
                        id={`audio-${demo.id}`}
                        name="audio"
                        type="file"
                        accept="audio/mpeg,.mp3"
                        className={fileCls}
                      />
                      <p className="mt-1 text-xs text-white/40">
                        Optional — leave empty to keep the current audio.
                      </p>
                    </div>
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      name="published"
                      defaultChecked={demo.published}
                      className="h-4 w-4 accent-[#c48b36]"
                    />
                    Published
                  </label>
                </ActionForm>

                <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
                  <DeleteDemoButton
                    id={demo.id}
                    name={[demo.title, demo.title_secondary]
                      .filter(Boolean)
                      .join(" — ")}
                    action={deleteDemo}
                  />
                </div>
              </div>
            </details>
          </div>
        ))}
      </SortableList>
    </div>
  );
}
