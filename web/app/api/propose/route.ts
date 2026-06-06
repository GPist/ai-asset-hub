// M4: Propose a change — creates branch+commit+PR as the authenticated user.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  updateFileContents,
  createPull,
  getFileContents,
  GiteaError,
} from "@/lib/gitea/client";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const token = (session as typeof session & { giteaToken?: string })?.giteaToken;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const body = await req.json() as {
    owner?: string;
    repo?: string;
    filePath?: string;
    fileSha?: string;
    content?: string;
    summary?: string;
  };

  const { owner, repo, filePath, fileSha, content, summary } = body;
  if (!owner || !repo || !filePath || !fileSha || content === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const login = (session as typeof session & { user: { login?: string } }).user?.login
    ?? session.user?.name
    ?? "user";

  const branchName = `propose/${login.replace(/[^a-zA-Z0-9-]/g, "-")}-${Date.now()}`;
  const commitMessage = summary?.trim()
    ? summary.trim()
    : `Propose changes to ${filePath}`;

  try {
    // Create branch + commit via contents API (new_branch triggers branch creation)
    await updateFileContents(owner, repo, filePath, {
      message: commitMessage,
      content,
      sha: fileSha,
      branch: "main",
      new_branch: branchName,
    }, token);

    // Open the PR
    const pr = await createPull(owner, repo, {
      title: commitMessage,
      body: summary?.trim() ?? "",
      head: branchName,
      base: "main",
    }, token);

    return NextResponse.json({ prNumber: pr.number });
  } catch (err) {
    console.error("[propose]", err);
    const msg = err instanceof GiteaError
      ? `Gitea error ${err.status}`
      : "Failed to create proposal";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
