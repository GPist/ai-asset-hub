// Admin: create a new asset repo in the hub org with a hub.json and entry file.
// Only users who have write access to the org (i.e. admins team members) can do this.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { GiteaError } from "@/lib/gitea/client";
import { reindexRepo } from "@/lib/catalog";

const GITEA_URL = process.env.GITEA_URL ?? "http://localhost:3001";
const HUB_ORG = process.env.HUB_ORG ?? "assets";
const ADMIN_TOKEN = process.env.GITEA_ADMIN_TOKEN ?? null;

interface CreateAssetBody {
  name?: string;
  title?: string;
  type?: string;
  summary?: string;
  tags?: string[];
  category?: string;
  targets?: string[];
  entry?: string;
  initialContent?: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function b64(s: string): string {
  return Buffer.from(s).toString("base64");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!ADMIN_TOKEN) {
    return NextResponse.json({ error: "GITEA_ADMIN_TOKEN not configured" }, { status: 503 });
  }

  const body = await req.json() as CreateAssetBody;
  const {
    name: rawName,
    title,
    type = "skill",
    summary = "",
    tags = [],
    category = "General",
    targets = ["generic"],
    entry = "SKILL.md",
    initialContent = "",
  } = body;

  if (!rawName || !title) {
    return NextResponse.json({ error: "name and title are required" }, { status: 400 });
  }

  const repoName = slugify(rawName);
  if (!repoName) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `token ${ADMIN_TOKEN}`,
  };

  // Create-or-update a file via the contents API, checking for errors.
  // GET the current SHA first: new files are POSTed, existing ones are PUT.
  async function writeFile(repo: string, path: string, content: string, message: string) {
    const url = `${GITEA_URL}/api/v1/repos/${HUB_ORG}/${repo}/contents/${path}`;
    const getRes = await fetch(`${url}?ref=main`, { headers });
    let sha: string | undefined;
    if (getRes.ok) {
      sha = ((await getRes.json()) as { sha?: string }).sha;
    }
    const res = await fetch(url, {
      method: sha ? "PUT" : "POST",
      headers,
      body: JSON.stringify({ message, content: b64(content), branch: "main", ...(sha ? { sha } : {}) }),
    });
    if (!res.ok) throw new GiteaError(res.status, `write ${path}: ${await res.text()}`);
  }

  try {
    // Create repo in org. auto_init:true gives it a main branch + first commit
    // so the contents API below has a base branch to commit against.
    const createRes = await fetch(`${GITEA_URL}/api/v1/orgs/${HUB_ORG}/repos`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: repoName,
        description: summary,
        private: false,
        auto_init: true,
        default_branch: "main",
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      if (createRes.status === 409) {
        return NextResponse.json({ error: "An asset with that name already exists" }, { status: 409 });
      }
      throw new GiteaError(createRes.status, text);
    }

    // Build hub.json
    const manifest = { name: repoName, title, type, summary, tags, category, targets, entry, version: "1.0.0" };
    const hubJson = JSON.stringify(manifest, null, 2);

    // Build entry file
    const entryContent = initialContent || [
      `---`,
      `name: ${repoName}`,
      `description: ${summary}`,
      `---`,
      ``,
      `# ${title}`,
      ``,
      `> ${summary}`,
      ``,
      `## Instructions`,
      ``,
      `_Describe what this ${type} does and how to use it._`,
    ].join("\n");

    const readme = [
      `# ${title}`,
      ``,
      summary,
      ``,
      `## Install`,
      ``,
      `Download from [AI Asset Hub](${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/a/${HUB_ORG}/${repoName}).`,
    ].join("\n");

    // Push files (hub.json + entry are new → POST; README exists from
    // auto_init → PUT). writeFile checks .ok and throws on failure.
    await writeFile(repoName, "hub.json", hubJson, "Add hub.json");
    await writeFile(repoName, entry, entryContent, `Add ${entry}`);
    await writeFile(repoName, "README.md", readme, "Update README.md");

    // Tag v1.0.0
    const tagsRes = await fetch(`${GITEA_URL}/api/v1/repos/${HUB_ORG}/${repoName}/git/refs/heads/main`, {
      headers,
    });
    if (tagsRes.ok) {
      const refs = await tagsRes.json() as Array<{ object?: { sha?: string } }>;
      const sha = refs[0]?.object?.sha;
      if (sha) {
        await fetch(`${GITEA_URL}/api/v1/repos/${HUB_ORG}/${repoName}/tags`, {
          method: "POST",
          headers,
          body: JSON.stringify({ tag_name: "v1.0.0", target: sha, message: "Initial release" }),
        });
      }
    }

    // Update catalog
    await reindexRepo(HUB_ORG, repoName);

    return NextResponse.json({ owner: HUB_ORG, repo: repoName });
  } catch (err) {
    console.error("[create-asset]", err);
    const msg = err instanceof GiteaError ? `Gitea error ${err.status}` : "Failed to create asset";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
