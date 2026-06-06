// Download asset as zip at a given version/ref.
// Proxies Gitea's /archive/ endpoint so the user's Gitea session isn't needed.
import { NextRequest, NextResponse } from "next/server";

const GITEA_URL = process.env.GITEA_URL ?? "http://localhost:3001";
const ADMIN_TOKEN = process.env.GITEA_ADMIN_TOKEN ?? null;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
): Promise<NextResponse> {
  // slug: [owner, repo, "<ref>.zip"]
  const { slug } = await params;
  if (!slug || slug.length < 3) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const owner = slug[0];
  const repo = slug[1];
  const refFile = slug[2]; // e.g. "v1.0.0.zip" or "main.zip"
  const ref = refFile.replace(/\.zip$/, "");

  const headers: Record<string, string> = {};
  if (ADMIN_TOKEN) headers["Authorization"] = `token ${ADMIN_TOKEN}`;

  const upstream = await fetch(
    `${GITEA_URL}/api/v1/repos/${owner}/${repo}/archive/${ref}.zip`,
    { headers }
  );

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Gitea ${upstream.status}` },
      { status: upstream.status }
    );
  }

  const blob = await upstream.arrayBuffer();
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${repo}-${ref}.zip"`,
    },
  });
}
