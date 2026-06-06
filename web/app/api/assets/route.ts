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

  try {
    // Create repo in org
    const createRes = await fetch(`${GITEA_URL}/api/v1/orgs/${HUB_ORG}/repos`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: repoName,
        description: summary,
        private: false,
        auto_init: false,
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

    // Push hub.json (first commit — creates main branch)
    await fetch(`${GITEA_URL}/api/v1/repos/${HUB_ORG}/${repoName}/contents/hub.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: "Add hub.json", content: b64(hubJson) }),
    });

    // Push entry file
    await fetch(`${GITEA_URL}/api/v1/repos/${HUB_ORG}/${repoName}/contents/${entry}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: `Add ${entry}`, content: b64(entryContent) }),
    });

    // Push README
    await fetch(`${GITEA_URL}/api/v1/repos/${HUB_ORG}/${repoName}/contents/README.md`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: "Add README.md", content: b64(readme) }),
    });

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
