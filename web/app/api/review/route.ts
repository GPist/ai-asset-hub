// M5: Admin review actions — approve/merge, request changes, decline.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { mergePull, requestChanges, closePull, GiteaError } from "@/lib/gitea/client";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const token = (session as typeof session & { giteaToken?: string })?.giteaToken;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const body = await req.json() as {
    owner?: string;
    repo?: string;
    pullNumber?: number;
    action?: "approve" | "request_changes" | "decline";
    comment?: string;
  };

  const { owner, repo, pullNumber, action, comment } = body;
  if (!owner || !repo || !pullNumber || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    switch (action) {
      case "approve":
        await mergePull(owner, repo, pullNumber, token);
        break;
      case "request_changes":
        await requestChanges(owner, repo, pullNumber, comment ?? "", token);
        break;
      case "decline":
        await closePull(owner, repo, pullNumber, token);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[review]", err);
    const msg = err instanceof GiteaError
      ? `Gitea error ${err.status}`
      : "Action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
