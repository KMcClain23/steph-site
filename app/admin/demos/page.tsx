import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { updateDemo } from "../actions";
import ActionForm from "../save-button";

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

function mmss(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default async function DemosAdminPage() {
  await requireAdmin();

  const { data, error } = await createServiceRoleClient()
    .from("demos")
    .select("id, title, title_secondary, subtitle, audio_url, duration_seconds, sort_order, published")
    .order("sort_order", { ascending: true });

  const demos = (data ?? []) as Row[];

  return (
    <div>
      <h1 className="section-title mb-2 text-2xl">Demos</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
        Show, hide, and reorder the demo reels. Adding a <em>new</em> demo still
        means committing the MP3 to the repo and running the duration script —
        uploads aren&rsquo;t built yet.
      </p>

      {error && (
        <p role="alert" className="mb-6 text-sm text-[#ffb4b4]">
          Couldn&rsquo;t load demos: {error.message}
        </p>
      )}

      <ul className="space-y-3">
        {demos.map((demo) => (
          <li
            key={demo.id}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="font-display font-semibold text-white">
                {[demo.title, demo.title_secondary].filter(Boolean).join(" — ")}
              </h2>
              <span className="text-sm text-white/50">{demo.subtitle}</span>
              <span className="ml-auto font-mono text-xs text-white/45">
                {mmss(demo.duration_seconds)}
              </span>
            </div>

            <audio
              controls
              preload="none"
              src={demo.audio_url}
              className="mt-3 h-9 w-full"
            />

            <ActionForm action={updateDemo} label="Save" className="mt-3">
              <input type="hidden" name="id" value={demo.id} />
              <div className="flex flex-wrap items-end gap-5">
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    name="published"
                    defaultChecked={demo.published}
                    className="h-4 w-4 accent-[#c48b36]"
                  />
                  Published
                </label>
                <div>
                  <label
                    htmlFor={`order-${demo.id}`}
                    className="mb-1.5 block text-xs uppercase tracking-wide text-white/50"
                  >
                    Sort order
                  </label>
                  <input
                    id={`order-${demo.id}`}
                    name="sort_order"
                    type="number"
                    min={0}
                    defaultValue={demo.sort_order}
                    className="w-28 rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            </ActionForm>
          </li>
        ))}
      </ul>
    </div>
  );
}
