// Exposes a .claude-plugin/marketplace.json compatible endpoint so Claude Code
// can add this hub as a native marketplace with:
//   /plugin marketplace add http://localhost:3000/api/marketplace.json
//
// Only includes assets with "claude-code" in their targets array.

import { NextResponse } from "next/server";
import { listAssets } from "@/lib/catalog";

const HUB_ORG = process.env.HUB_ORG ?? "assets";
// Public URL so the git source link works in users' browsers / Claude Code
const GITEA_PUBLIC_URL =
  process.env.GITEA_PUBLIC_URL ?? process.env.GITEA_URL ?? "http://localhost:3001";
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function GET(): Promise<NextResponse> {
  const assets = listAssets().filter((a) => a.targets.includes("claude-code"));

  const plugins = assets.map((a) => ({
    id: `${HUB_ORG}.${a.name}`,
    name: a.title,
    description: a.summary,
    version: a.version,
    type: a.type,
    tags: a.tags,
    category: a.category,
    source: {
      type: "git",
      url: `${GITEA_PUBLIC_URL}/${a.owner}/${a.repo}`,
    },
    download: `${NEXTAUTH_URL}/api/install/${a.owner}/${a.repo}/${a.version}.zip`,
    homepage: `${NEXTAUTH_URL}/a/${a.owner}/${a.repo}`,
  }));

  return NextResponse.json(
    {
      name: "AI Asset Hub",
      description: "Shared skills, hooks, agents and prompts",
      version: "1",
      plugins,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
