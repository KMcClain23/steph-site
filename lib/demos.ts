/**
 * Demo types only — DemoGrid and DemoPlayer are client components, so this
 * module must stay free of server imports. The query is in
 * lib/queries.server.ts.
 */

export type Demo = {
  id: string;
  title: string;
  title_secondary: string | null;
  subtitle: string | null;
  audio_url: string;
  duration_seconds: number | null;
};
