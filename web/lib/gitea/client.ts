// Typed Gitea API client.
// Every function takes a token (the session user's OAuth token) so all API
// calls are attributed to the real authenticated user.

const GITEA_URL = process.env.GITEA_URL ?? "http://localhost:3001";

export type GiteaToken = string;

export interface GiteaRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  owner?: { login: string; avatar_url: string };
}

export interface GiteaCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  author: { login: string; avatar_url: string } | null;
}

export interface GiteaTag {
  name: string;
  message: string;
  commit: { sha: string; created: string };
}

export interface GiteaPull {
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  head: { sha: string; label: string; ref: string; repo: GiteaRepo };
  base: { ref: string };
  mergeable: boolean | null;
}

export interface GiteaContentsFile {
  name: string;
  path: string;
  sha: string;
  content: string; // base64
  encoding: string;
  type: "file" | "dir";
}

async function giteaFetch<T>(
  path: string,
  token: GiteaToken | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `token ${token}`;

  const res = await fetch(`${GITEA_URL}/api/v1${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GiteaError(res.status, `Gitea ${res.status} ${path}: ${body}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export class GiteaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ── Repos ────────────────────────────────────────────────────────────────────

export async function listOrgRepos(
  org: string,
  token: GiteaToken | null
): Promise<GiteaRepo[]> {
  return giteaFetch<GiteaRepo[]>(
    `/orgs/${org}/repos?limit=50&page=1`,
    token
  );
}

export async function getRepo(
  owner: string,
  repo: string,
  token: GiteaToken | null
): Promise<GiteaRepo> {
  return giteaFetch<GiteaRepo>(`/repos/${owner}/${repo}`, token);
}

export async function forkRepo(
  owner: string,
  repo: string,
  token: GiteaToken
): Promise<GiteaRepo> {
  return giteaFetch<GiteaRepo>(`/repos/${owner}/${repo}/forks`, token, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// ── File contents ────────────────────────────────────────────────────────────

export async function getFileContents(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token: GiteaToken | null
): Promise<GiteaContentsFile> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  return giteaFetch<GiteaContentsFile>(
    `/repos/${owner}/${repo}/contents/${path}${q}`,
    token
  );
}

export function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/\n/g, ""), "base64").toString("utf-8");
}

export async function updateFileContents(
  owner: string,
  repo: string,
  path: string,
  params: {
    message: string;
    content: string; // raw text — we base64-encode here
    sha: string;
    branch: string;
    new_branch?: string;
  },
  token: GiteaToken
): Promise<{ content: GiteaContentsFile; commit: { sha: string } }> {
  return giteaFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({
        ...params,
        content: Buffer.from(params.content).toString("base64"),
      }),
    }
  );
}

// ── Commits ──────────────────────────────────────────────────────────────────

export async function listCommits(
  owner: string,
  repo: string,
  ref: string | undefined,
  token: GiteaToken | null
): Promise<GiteaCommit[]> {
  const q = ref ? `?sha=${encodeURIComponent(ref)}` : "";
  return giteaFetch<GiteaCommit[]>(
    `/repos/${owner}/${repo}/commits${q}&limit=30`,
    token
  );
}

export async function getCommitDiff(
  owner: string,
  repo: string,
  sha: string,
  token: GiteaToken | null
): Promise<string> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `token ${token}`;
  const res = await fetch(
    `${GITEA_URL}/api/v1/repos/${owner}/${repo}/git/commits/${sha}.diff`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) throw new GiteaError(res.status, `diff ${sha}`);
  return res.text();
}

export async function compareDiff(
  owner: string,
  repo: string,
  base: string,
  head: string,
  token: GiteaToken | null
): Promise<string> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `token ${token}`;
  const res = await fetch(
    `${GITEA_URL}/${owner}/${repo}/compare/${base}...${head}.diff`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) throw new GiteaError(res.status, `compare ${base}...${head}`);
  return res.text();
}

// ── Tags / releases ───────────────────────────────────────────────────────────

export async function listTags(
  owner: string,
  repo: string,
  token: GiteaToken | null
): Promise<GiteaTag[]> {
  return giteaFetch<GiteaTag[]>(
    `/repos/${owner}/${repo}/tags?limit=30`,
    token
  );
}

// ── Pull requests ─────────────────────────────────────────────────────────────

export async function createPull(
  owner: string,
  repo: string,
  params: {
    title: string;
    body: string;
    head: string; // branch
    base: string;
  },
  token: GiteaToken
): Promise<GiteaPull> {
  return giteaFetch<GiteaPull>(`/repos/${owner}/${repo}/pulls`, token, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function listOpenPulls(
  owner: string,
  repo: string,
  token: GiteaToken | null
): Promise<GiteaPull[]> {
  return giteaFetch<GiteaPull[]>(
    `/repos/${owner}/${repo}/pulls?state=open&limit=50`,
    token
  );
}

export async function getPull(
  owner: string,
  repo: string,
  index: number,
  token: GiteaToken | null
): Promise<GiteaPull> {
  return giteaFetch<GiteaPull>(`/repos/${owner}/${repo}/pulls/${index}`, token);
}

export async function mergePull(
  owner: string,
  repo: string,
  index: number,
  token: GiteaToken
): Promise<void> {
  await giteaFetch<unknown>(`/repos/${owner}/${repo}/pulls/${index}/merge`, token, {
    method: "POST",
    body: JSON.stringify({ Do: "squash", merge_message_field: "Approved & published" }),
  });
}

export async function requestChanges(
  owner: string,
  repo: string,
  index: number,
  comment: string,
  token: GiteaToken
): Promise<void> {
  await giteaFetch<unknown>(`/repos/${owner}/${repo}/pulls/${index}/reviews`, token, {
    method: "POST",
    body: JSON.stringify({ event: "REQUEST_CHANGES", body: comment }),
  });
}

export async function closePull(
  owner: string,
  repo: string,
  index: number,
  token: GiteaToken
): Promise<void> {
  await giteaFetch<unknown>(`/repos/${owner}/${repo}/pulls/${index}`, token, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" }),
  });
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface GiteaUser {
  id: number;
  login: string;
  full_name: string;
  email: string;
  avatar_url: string;
}

export async function getAuthenticatedUser(token: GiteaToken): Promise<GiteaUser> {
  return giteaFetch<GiteaUser>("/user", token);
}
