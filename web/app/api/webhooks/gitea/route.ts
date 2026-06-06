// Gitea push webhook: reindex one repo when content is pushed.
import { NextRequest, NextResponse } from "next/server";
import { reindexRepo } from "@/lib/catalog";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      repository?: { owner?: { login?: string }; name?: string };
    };
    const owner = body?.repository?.owner?.login;
    const repo = body?.repository?.name;
    if (owner && repo) {
      await reindexRepo(owner, repo);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] gitea:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
