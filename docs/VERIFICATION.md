# Verification Status

Last run: 2026-06-06 (local dev machine, macOS, Docker Desktop).

## ✅ Verified

### Build (Docker image)
- `docker compose build web` succeeds end-to-end.
- All **18 routes** compile (catalog, asset detail, propose, review, new, connect, and all `/api/*`).
- TypeScript type-check passes; ESLint passes.
- `better-sqlite3` native module compiles for Alpine/musl in the image.

### Runtime (web app standalone — Gitea not required)
Ran the built image directly: `docker run -p 3000:3000 ai-asset-hub-web:latest`

| Check | Result |
|---|---|
| App boots (Next.js standalone) | ✅ Ready in ~30ms |
| `GET /` (catalog) | ✅ HTTP 200, renders empty-state |
| `GET /connect` | ✅ HTTP 200, renders Claude Code marketplace instructions |
| `GET /api/marketplace.json` | ✅ HTTP 200, valid JSON `{...,"plugins":[]}` |
| `better-sqlite3` native binding loads at runtime | ✅ catalog DB opens, `listAssets()` returns `[]` |
| Graceful degradation when Gitea unreachable | ✅ no crash; logs `reindex failed: fetch failed`, page still 200s |

## ⏳ Pending (blocked by local Docker environment, not by code)

The full Gitea-backed end-to-end flow — **OIDC login, propose→PR, admin review→merge,
download from a real repo, fork, rollback** — requires the `gitea/gitea:1.22` and
`postgres:16-alpine` images. On this machine, Docker Desktop **cannot pull any image**
(even 13 KB `hello-world` hangs).

### Root cause
Inside the Docker Desktop VM, Docker Hub hostnames resolve to **IPv6-only** addresses:

```
$ docker run --rm postgres:15-alpine getent hosts registry-1.docker.io
2600:1f18:2148:bc02:... registry-1.docker.io     # AAAA only, no A record
```

The VM's internal resolver (`192.168.65.7`) returns no IPv4 `A` records, and the VM
can't route IPv6 to the internet — so every pull hangs connecting to the IPv6 address.
The host's own network is fine (`curl https://registry-1.docker.io/v2/` → 401 as expected).

### Fix (one-time, on this machine)
Set a real DNS resolver for the Docker daemon so it also gets IPv4 `A` records:

**Docker Desktop → Settings → Docker Engine**, add:
```json
{ "dns": ["8.8.8.8", "1.1.1.1"] }
```
then **Apply & Restart**. (Editing `~/.docker/daemon.json` directly does **not** stick —
Docker Desktop manages that file and reverts it.)

Alternatively enable IPv6 networking in Docker Desktop, or pre-pull on a network that
returns IPv4.

### Then finish E2E
```bash
docker compose --profile demo up          # Gitea + Postgres + web + Dex (demo IdP)
# 1. open http://localhost:3000  → catalog shows the seeded "PDF Extractor"
# 2. sign in via Dex (alice@example.com / password)
# 3. open the asset → "Propose a change" → edit → "Send for review"
# 4. add your user to the `admins` team in Gitea, then /review → "Approve & publish"
# 5. confirm the merge commit shows Verified, download the zip, install to ~/.claude/skills/
# 6. roll back to v1.0.0 from the version history and confirm the diff
```

The verification steps map 1:1 to milestones M0–M6 in [SPEC.md](../SPEC.md#12-verification-end-to-end).
