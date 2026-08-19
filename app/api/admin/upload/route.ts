import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { readAudioDuration, uploadCover, uploadDemoAudio } from "@/lib/storage";

/**
 * Uploads happen here rather than inside a server action.
 *
 * Three reasons, all of which were real problems:
 *
 *  - Progress. A server action's request body gives the browser no progress
 *    events, so a 25MB MP3 sat on "Saving…" with no sign of life and looked
 *    frozen. An XHR to this route reports bytes as they go.
 *  - Body size. Sending files through an action meant raising
 *    serverActions.bodySizeLimit for every action on the site. Now the actions
 *    only ever carry a URL string.
 *  - Wasted work. Uploading as part of Save meant a validation failure
 *    elsewhere in the form threw the finished upload away.
 */

export const maxDuration = 60;

export async function POST(request: Request) {
  // getAdminUser rather than requireAdmin: this is fetch(), and a redirect
  // response to a login page is useless to the caller. Answer with a status
  // the client can actually act on.
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Open the admin in a new tab, sign in, then try again." },
      { status: 401 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const title = String(form.get("title") ?? "upload");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file was received." }, { status: 400 });
  }

  if (kind === "cover") {
    const result = await uploadCover(file, title);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ url: result.url, bytes: result.bytes });
  }

  if (kind === "demo") {
    const result = await uploadDemoAudio(file, title);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    // Parsed server-side while the bytes are already in hand, so the card can
    // show a real length without the browser ever downloading the audio.
    const duration = await readAudioDuration(file);
    return NextResponse.json({ url: result.url, bytes: result.bytes, duration });
  }

  return NextResponse.json({ error: "Unknown upload type." }, { status: 400 });
}
