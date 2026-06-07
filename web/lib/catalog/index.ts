// Catalog index: reads hub.json from each org repo and caches in SQLite.
// Refreshed by Gitea webhooks (push events) via /api/webhooks/gitea.

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import {
  listOrgRepos,
  getFileContents,
  decodeBase64,
  GiteaError,
} from "@/lib/gitea/client";

const DB_PATH = process.env.CATALOG_DB ?? path.join(process.cwd(), ".catalog.db");
const HUB_ORG = process.env.HUB_ORG ?? "ai-assets";
const ADMIN_TOKEN = process.env.GITEA_ADMIN_TOKEN ?? null;

export interface HubManifest {
  name: string;
  title: string;
  type: "skill" | "hook" | "agent" | "prompt" | "plugin";
  summary: string;
  tags: string[];
  category: string;
  targets: string[];
  entry: string;
  version: string;
}

export interface CatalogAsset extends HubManifest {
  owner: string;
  repo: string;
  updatedAt: string;
}

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      owner TEXT NOT NULL,
      repo  TEXT NOT NULL,
      manifest TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (owner, repo)
    );
  `);
  return _db;
}

export function upsertAsset(owner: string, repo: string, manifest: HubManifest, updatedAt: string): void {
  db().prepare(`
    INSERT INTO assets (owner, repo, manifest, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (owner, repo) DO UPDATE SET manifest=excluded.manifest, updated_at=excluded.updated_at
  `).run(owner, repo, JSON.stringify(manifest), updatedAt);
}

export function removeAsset(owner: string, repo: string): void {
  db().prepare("DELETE FROM assets WHERE owner=? AND repo=?").run(owner, repo);
}

export function listAssets(query?: string): CatalogAsset[] {
  let rows: Array<{ owner: string; repo: string; manifest: string; updated_at: string }>;
  if (query) {
    rows = db().prepare(
      "SELECT * FROM assets WHERE manifest LIKE ? ORDER BY updated_at DESC"
    ).all(`%${query}%`) as typeof rows;
  } else {
    rows = db().prepare(
      "SELECT * FROM assets ORDER BY updated_at DESC"
    ).all() as typeof rows;
  }
  return rows.map((r) => ({
    ...(JSON.parse(r.manifest) as HubManifest),
    owner: r.owner,
    repo: r.repo,
    updatedAt: r.updated_at,
  }));
}

export function getAsset(owner: string, repo: string): CatalogAsset | null {
  const row = db().prepare(
    "SELECT * FROM assets WHERE owner=? AND repo=?"
  ).get(owner, repo) as { owner: string; repo: string; manifest: string; updated_at: string } | undefined;
  if (!row) return null;
  return {
    ...(JSON.parse(row.manifest) as HubManifest),
    owner: row.owner,
    repo: row.repo,
    updatedAt: row.updated_at,
  };
}

// ── Full re-index ─────────────────────────────────────────────────────────────

export async function reindexAll(): Promise<void> {
  const repos = await listOrgRepos(HUB_ORG, ADMIN_TOKEN);
  for (const repo of repos) {
    await reindexRepo(HUB_ORG, repo.name);
  }
}

export async function reindexRepo(owner: string, repo: string): Promise<void> {
  try {
    const file = await getFileContents(owner, repo, "hub.json", undefined, ADMIN_TOKEN);
    const manifest = JSON.parse(decodeBase64(file.content)) as HubManifest;
    upsertAsset(owner, repo, manifest, new Date().toISOString());
  } catch (err) {
    if (err instanceof GiteaError && err.status === 404) {
      // Not a hub asset repo — remove from index if it was there
      removeAsset(owner, repo);
    } else {
      console.error(`[catalog] reindex ${owner}/${repo}:`, err);
    }
  }
}

// ── Lazy init: seed on first request if DB is empty ──────────────────────────

export async function ensureIndexed(): Promise<void> {
  const count = (db().prepare("SELECT COUNT(*) as n FROM assets").get() as { n: number }).n;
  if (count === 0) {
    await reindexAll().catch((err) =>
      console.error("[catalog] initial reindex failed:", err)
    );
  }
}
