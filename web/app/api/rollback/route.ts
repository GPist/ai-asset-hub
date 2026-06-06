// M6: Roll back to a prior version.
// Creates a new commit on a branch that restores the entry file to the content
// at the given ref, then opens a PR titled "Roll back to <ref>".
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  getFileContents,
  decodeBase64,
  updateFileContents,
  createPull,
  GiteaError,
} from "@/lib/gitea/client";
import { getAsset } from "@/lib/catalog";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const token = (session as typeof session & { giteaToken?: string })?.giteaToken;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const body = await req.json() as {
    owner?: string;
    repo?: string;
    targetRef?: string; // the ref/tag/SHA to roll back to
  };

  const { owner, repo, targetRef } = body;
  if (!owner || !repo || !targetRef) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const catalogAsset = getAsset(owner, repo);
  if (!catalogAsset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const adminToken = process.env.GITEA_ADMIN_TOKEN ?? null;
  const login =
    (session as typeof session & { user: { login?: string } }).user?.login ??
    session.user?.name ??
    "user";

  try {
    // Get file content at the target ref
    const oldFile = await getFileContents(owner, repo, catalogAsset.entry, targetRef, adminToken);
    const oldContent = decodeBase64(oldFile.content);

    // Get current HEAD file SHA (needed to update)
    const currentFile = await getFileContents(owner, repo, catalogAsset.entry, undefined, adminToken);

    const branchName = `rollback/${login.replace(/[^a-zA-Z0-9-]/g, "-")}-to-${targetRef.replace(/[^a-zA-Z0-9.-]/g, "-")}-${Date.now()}`;
    const commitMessage = `Roll back ${catalogAsset.entry} to ${targetRef}`;

    await updateFileContents(owner, repo, catalogAsset.entry, {
      message: commitMessage,
      content: oldContent,
      sha: currentFile.sha,
      branch: "main",
      new_branch: branchName,
    }, token);

    const pr = await createPull(owner, repo, {
      title: `Roll back to ${targetRef}`,
      body: `Restores \`${catalogAsset.entry}\` to the state at \`${targetRef}\`.`,
      head: branchName,
      base: "main",
    }, token);

    return NextResponse.json({ prNumber: pr.number });
  } catch (err) {
    console.error("[rollback]", err);
    const msg = err instanceof GiteaError ? `Gitea error ${err.status}` : "Rollback failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
