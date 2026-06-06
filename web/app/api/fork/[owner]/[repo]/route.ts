// M6: Fork an asset repo.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { forkRepo, GiteaError } from "@/lib/gitea/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/", _req.url));

  const token = (session as typeof session & { giteaToken?: string })?.giteaToken;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const { owner, repo } = await params;

  try {
    const forked = await forkRepo(owner, repo, token);
    return NextResponse.redirect(
      new URL(`/a/${forked.owner?.login ?? owner}/${forked.name}`, _req.url)
    );
  } catch (err) {
    console.error("[fork]", err);
    if (err instanceof GiteaError && err.status === 409) {
      // Fork already exists — find it and redirect
      const login = (session as typeof session & { user: { login?: string } }).user?.login;
      return NextResponse.redirect(new URL(`/a/${login}/${repo}`, _req.url));
    }
    return NextResponse.json({ error: "Fork failed" }, { status: 500 });
  }
}
