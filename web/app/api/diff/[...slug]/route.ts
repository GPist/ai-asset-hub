// Returns a raw unified diff between two refs for the review card diff viewer.
import { NextRequest, NextResponse } from "next/server";

const GITEA_URL = process.env.GITEA_URL ?? "http://localhost:3001";
const ADMIN_TOKEN = process.env.GITEA_ADMIN_TOKEN ?? null;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
): Promise<NextResponse> {
  // slug: [owner, repo, "base...head"]
  const { slug } = await params;
  if (!slug || slug.length < 3) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const owner = slug[0];
  const repo = slug[1];
  const range = slug[2]; // "base...head"

  const headers: Record<string, string> = {};
  if (ADMIN_TOKEN) headers["Authorization"] = `token ${ADMIN_TOKEN}`;

  const upstream = await fetch(
    `${GITEA_URL}/${owner}/${repo}/compare/${range}.diff`,
    { headers }
  );

  if (!upstream.ok) {
    return new NextResponse("", { status: upstream.status });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain" },
  });
}
