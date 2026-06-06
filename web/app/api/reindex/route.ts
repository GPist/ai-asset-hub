// Admin endpoint: trigger a full catalog reindex.
// Useful after bootstrap or after manually pushing assets to Gitea.
import { NextRequest, NextResponse } from "next/server";
import { reindexAll } from "@/lib/catalog";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const adminToken = process.env.GITEA_ADMIN_TOKEN;
  const authHeader = req.headers.get("authorization");
  // Simple bearer-token guard: only the admin token can trigger a full reindex
  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await reindexAll();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reindex]", err);
    return NextResponse.json({ error: "Reindex failed" }, { status: 500 });
  }
}
