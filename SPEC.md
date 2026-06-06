# SPEC: AI Asset Hub — open-source collaboration hub for skills / hooks / agents / `.md`

> Self-hostable, open-source app. Non-technical users propose changes to AI assets; a central
> team reviews and merges; everyone can discover and download. Git does the version control;
> a friendly UI hides it. Engine = **Gitea (MIT), run headless**. Front-end = **Next.js + TS**.

---

## 1. Context

**Problem.** The org maintains skills/hooks/agents (mostly Markdown + small scripts/config) built
in Claude.ai / Cowork / Claude Code / ChatGPT-Codex. Users want to contribute/fork/improve, but
there is no path, and **taking in contributions has become incredibly hard**.

**Research finding (June 2026).** No purpose-built OSS project exists for "publish AI assets →
fork → propose → review → merge → sign → download" with accounts. Existing options are static
"awesome lists", git-repo marketplaces (`.claude-plugin/marketplace.json` = JSON manifest + GitHub
PRs), or read-only discovery sites — none have the contribution/review/account/signing layer.

**Design insight.** Assets are just files; **Git already gives** diffs, rollbacks, history,
commits, branches, forks, PRs, merge review, signed commits. We do **not** reinvent VC. We run
**Gitea headless** as the engine and build only the value-add: **non-technical UX + asset catalog
+ cross-tool install**.

**Outcome.** A company self-hosts the app. Authors see plain language ("Propose a change", "Send
for review", "Approve & publish"); Gitea handles git/PR/merge/signing/auth underneath. Doubles as
a discovery catalog with downloads + per-tool install.

---

## 2. Locked decisions

| # | Decision |
|---|---|
| D1 | Standalone OSS app, self-hosted per company. Not SaaS; not hardwired to GitHub/Azure DevOps. |
| D2 | **Bring-your-own identity**: pluggable OIDC/SSO; we ship plumbing, company wires its provider. |
| D3 | General-purpose for `.md`/text assets, not only code. |
| D4 | Contributors are **mostly non-technical** → translate git jargon to plain language. |
| D5 | **Gitea headless engine + custom front-end** (not light re-skin; not build-on-existing-host). |
| D6 | Engine **Gitea, MIT** (over Forgejo/GPLv3) so re-skin/redistribute is unrestricted. |
| D7 | Project license **MIT**. |
| D8 | Asset storage = **repo-per-asset** under one Gitea org. |
| D9 | Signing MVP = **OIDC-bound authorship + instance commit signing** (per-user keys / Sigstore later). |

### Plain-language contract (UI label → git reality, hidden)
| UI label | Git reality |
|---|---|
| New version / Save | commit |
| Propose a change | create branch + commit + open PR |
| Send for review | mark PR ready for review |
| Approve & publish | merge PR (squash) |
| Ask for changes | PR review comment (request changes) |
| Decline | close PR |
| Make your own copy | fork |
| What changed | rendered diff |
| Version history | commit log |
| Roll back to this version | new commit reverting to ref |

---

## 3. Architecture

```
 Author/Admin (browser)
        │
        ▼
 ┌─────────────────────────────────────────────┐
 │ Front-end "AI Asset Hub" (Next.js + TS)      │
 │  /            catalog + search               │
 │  /a/[owner]/[asset]   detail, history, diff  │
 │  /a/.../propose       browser edit → PR      │
 │  /review              admin review queue     │
 │  /api/install/...     artifact + install cmd │
 └───────────────┬─────────────────────────────┘
                 │ Gitea REST API (per-user OAuth token)
 ┌───────────────▼─────────────────────────────┐
 │ Gitea (HEADLESS, MIT) — never shown to users │
 │  repos·branches·commits·forks·PRs·merge·     │
 │  reviews·diffs·history·releases·             │
 │  instance signing·OAuth2 provider+OIDC source│
 └───────────────┬─────────────────────────────┘
                 │ login delegated to
 ┌───────────────▼─────────────────────────────┐
 │ Company OIDC/SSO (Keycloak/Okta/Entra/Dex)   │
 └─────────────────────────────────────────────┘
```

**Auth flow (concrete):**
1. User hits front-end → Auth.js redirects to **Gitea's OAuth2 authorize** endpoint
   (`/login/oauth/authorize`, Authorization Code + PKCE).
2. Gitea, configured with an **OIDC authentication source**, redirects to the company IdP; on
   return it **auto-registers** the Gitea user (`ENABLE_AUTO_REGISTRATION = true`).
3. Gitea issues an OAuth token to the front-end. Front-end stores it in the session and calls the
   Gitea API **as that user** → every commit/PR is attributed to the real authenticated identity.

**Why repo-per-asset (D8):** forks, PRs, and per-asset history map 1:1 to a repo. The catalog
aggregates across repos via the API + webhooks (not per-request scanning).

**Signing (D9, honest):** non-technical users won't manage keys. MVP = identity from OIDC login
(commit author) + **instance signing** of merge commits so consumers verify "from our hub". Config:
`[repository.signing] SIGNING_KEY = …`, `MERGES = always`. Later: user-supplied SSH/GPG key for
personal "Verified" badge, or keyless **Sigstore/gitsign**.

---

## 4. Data model

**Org**: one Gitea org per deployment, e.g. `assets` (configurable). Admin team = a Gitea org team
with write/merge; everyone else read + fork.

**Repo-per-asset**, naming `assets/<kebab-name>`. Each repo contains:
```
<asset>/
├── hub.json            # hub manifest (below) — REQUIRED
├── SKILL.md            # or AGENTS.md / prompt.md — the asset body
├── README.md           # rendered on detail page (optional; falls back to SKILL.md)
└── (scripts/, assets/) # optional supporting files
```

**`hub.json` schema (the only new format we define):**
```jsonc
{
  "name": "pdf-extractor",
  "title": "PDF Extractor",
  "type": "skill",                 // skill | hook | agent | prompt | plugin
  "summary": "Extracts tables from PDFs.",
  "tags": ["pdf", "data"],
  "category": "Documents",
  "targets": ["claude-code", "codex", "cowork", "generic"],  // install destinations
  "entry": "SKILL.md",             // primary file
  "version": "1.2.0"               // mirrors latest release tag; informational
}
```

**Versions** = git tags / releases (`v1.2.0`). "Roll back" = create a release/commit from an
older tag. Catalog shows tags as the version dropdown.

---

## 5. Gitea API usage (no VC code written — these endpoints back each feature)

| Feature | Gitea API |
|---|---|
| List assets (catalog) | `GET /orgs/{org}/repos`, then `GET /repos/{o}/{r}/contents/hub.json` |
| Render asset | `GET /repos/{o}/{r}/contents/{path}` (+ `media`/`raw`) |
| Version history | `GET /repos/{o}/{r}/commits`, `GET /repos/{o}/{r}/tags` |
| "What changed" diff | `GET /repos/{o}/{r}/git/commits/{sha}.diff` or compare `…/compare/{a}...{b}` |
| Propose a change | `POST …/contents/{path}` (creates branch+commit) → `POST …/pulls` |
| Review queue | `GET /repos/{o}/{r}/pulls?state=open` (across org repos) |
| Approve & publish | `POST …/pulls/{i}/merge` (`Do: squash`) |
| Ask for changes | `POST …/pulls/{i}/reviews` (`event: REQUEST_CHANGES`) |
| Decline | `PATCH …/pulls/{i}` (`state: closed`) |
| Make your own copy | `POST /repos/{o}/{r}/forks` |
| Download asset | `GET /repos/{o}/{r}/archive/{ref}.zip` |
| Catalog freshness | Gitea **webhooks** → `/api/webhooks/gitea` → reindex one repo |

Token: front-end calls these with the **session user's** Gitea OAuth token. A separate **admin
service token** (env) is used only for bootstrap + webhook reindex.

---

## 6. Cross-tool install (Phase 2 logic, define mapping now)

| `targets` value | Install destination | MVP behavior |
|---|---|---|
| `generic` | download zip | ✅ MVP |
| `claude-code` | `.claude/skills/<name>/` | ✅ MVP: copy-paste command + zip |
| `codex` | `.agents/skills/<name>/` | Phase 2 |
| `cowork` | Cowork plugin dir (`.claude-plugin/`) | Phase 2 |

Bonus interop: expose `GET /.claude-plugin/marketplace.json` aggregating all `claude-code`-targeted
assets so Claude Code can consume the hub natively (Phase 2).
Out of scope: **Custom GPTs** (closed, non-exportable) — document, don't support.

---

## 7. Repo skeleton (greenfield — create this)

```
ai-asset-hub/
├── docker-compose.yml          # services: gitea, web, db(postgres), dex(demo IdP, profile=demo)
├── .env.example                # GITEA_URL, GITEA_ADMIN_TOKEN, OIDC_*, NEXTAUTH_*
├── gitea/
│   ├── app.ini.tmpl            # OAuth2 source + signing + auto-register config
│   └── bootstrap.sh            # create org, admin team, seed 1 sample asset repo
├── web/                        # Next.js (App Router) + TypeScript + Tailwind
│   ├── app/
│   │   ├── page.tsx                    # catalog
│   │   ├── a/[owner]/[asset]/page.tsx  # detail: render, history, version dropdown, download
│   │   ├── a/[owner]/[asset]/propose/page.tsx  # browser edit → PR
│   │   ├── review/page.tsx             # admin review queue
│   │   └── api/{auth,webhooks/gitea,install/[...]}/route.ts
│   ├── lib/gitea/client.ts     # typed wrappers for §5 endpoints
│   ├── lib/catalog/index.ts    # hub.json parse + SQLite index + webhook refresh
│   ├── lib/auth/options.ts     # Auth.js: generic OIDC provider → Gitea
│   └── lib/install/targets.ts  # §6 mapping + zip builder
├── cli/                        # Phase 2: `npx ai-asset-hub install <name>`
└── docs/{SETUP.md,IDENTITY.md,CONTRIBUTING.md}
```

---

## 8. Build order (milestones + acceptance criteria)

**M0 — Infra up.** `docker-compose.yml` runs Gitea + Postgres + web shell. `gitea/bootstrap.sh`
creates org `assets`, an `admins` team, and seeds one sample skill repo with `hub.json`.
*Done when:* `docker compose up` serves Gitea (headless) and a placeholder web page; sample repo
visible via Gitea API.

**M1 — Auth (D2).** Auth.js OIDC→Gitea bridge; Gitea OIDC source → Dex (demo). Session holds the
user's Gitea token.
*Done when:* logging in through Dex auto-provisions a Gitea user; the app can `GET /user` as them.

**M2 — Browse + download.** Catalog lists assets (from index); detail page renders `SKILL.md`/
`README.md`, shows version dropdown (tags) + history; **Download** returns the asset zip.
*Done when:* catalog shows the seeded asset; download yields a working zip.

**M3 — Version diff.** Detail page "What changed" renders a plain-language diff between two versions.
*Done when:* selecting two versions shows an added/removed-line diff with friendly headers.

**M4 — Propose a change.** Browser edit of the entry Markdown → branch+commit+PR via API, in
friendly wording; confirmation screen.
*Done when:* a non-admin edit produces a branch + commit + open PR in Gitea, attributed to the user.

**M5 — Admin review queue.** `/review` lists open PRs across org repos with rendered diff;
**Approve & publish** (squash-merge), **Ask for changes**, **Decline**.
*Done when:* an admin merges a proposal; history updates; merge commit shows **signed/Verified**.

**M6 — Forks + rollback.** "Make your own copy" forks; "Roll back to this version" opens a
revert-to-ref proposal.
*Done when:* fork appears under the user; a rollback proposal merges cleanly.

**Phase 2 (post-MVP):** Codex/Cowork install + installer CLI; `marketplace.json` endpoint;
search/categories UI; per-user or Sigstore signing; multi-file/upload-new-version editing;
role-management UI.

---

## 9. Tech stack

- **Front-end/back-end**: Next.js (App Router) + TypeScript + Tailwind. (Alt: Go for single-binary
  parity with Gitea — slower UI iteration; not chosen.)
- **Auth**: Auth.js (NextAuth) generic OIDC provider → Gitea.
- **Catalog index**: SQLite (file) refreshed by Gitea webhooks. No separate search service in MVP.
- **Markdown/diff render**: `react-markdown` + a diff renderer (e.g. `diff2html`-style).
- **Packaging**: Docker images for `gitea` (official) + `web`; one `docker-compose.yml`.

---

## 10. Setup / config snippets (for `docs/SETUP.md`)

**Gitea `app.ini` (key sections):**
```ini
[service]
ENABLE_AUTO_REGISTRATION = true        ; auto-provision OIDC users
[oauth2]                               ; Gitea acts as OAuth2 provider for the web app
ENABLE = true
[repository.signing]
SIGNING_KEY = default                  ; instance signs merges
MERGES      = always
```
**Gitea OIDC source** (BYO identity) added via `gitea admin auth add-oauth … --provider openidConnect …`.
**Web `.env`:** `GITEA_URL`, `GITEA_ADMIN_TOKEN` (bootstrap+webhook only), `OIDC_ISSUER/ID/SECRET`
(the app's OAuth client registered in Gitea), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

---

## 11. Risks & open questions

- **Multi-file editing for non-tech users**: MVP edits single Markdown; multi-file via
  "upload new version" (zip) or power-user fork+local. (Revisit in Phase 2.)
- **Merge conflicts in plain language**: hard. MVP routes conflicts to "a maintainer will help",
  no conflict-resolution UI.
- **Cross-tool format divergence**: storage stays tool-agnostic (folder + `hub.json`); install
  layer adapts. Custom GPTs excluded (closed format).
- **Scale (hundreds of repos)**: catalog must be webhook-driven, not API-scanned per page.

---

## 12. Verification (end-to-end)

1. `docker compose --profile demo up` → Gitea + web + Dex (demo IdP).
2. Log in via Dex → confirm Gitea user auto-provisioned and app can call API as them.
3. As **author**: open sample asset → "Propose a change" → confirm branch+commit+PR in Gitea,
   attributed to the user.
4. As **admin**: `/review` → view plain-language diff → "Approve & publish" → confirm squash-merge,
   updated history, **Verified** merge commit.
5. **Download** asset, install into a local `.claude/skills/` → confirm Claude Code loads the skill.
6. **Roll back** to a prior version → confirm diff view and a clean rollback merge.

---

## 13. Explicitly NOT building (simplicity guardrails)

- No custom version-control engine (Gitea does it).
- No per-user key management in MVP (instance signing + OIDC authorship suffices).
- No Custom-GPT import/export (closed format).
- No conflict-resolution UI for non-technical users in MVP.
- No multi-tenant SaaS layer — single self-hosted org per deployment.

---

## 14. First action on entering goal mode

Copy this spec into the project as `org_skills/SPEC.md`, then scaffold `ai-asset-hub/` per §7 and
begin **M0**.
