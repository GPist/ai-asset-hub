#!/usr/bin/env bash
# Bootstrap script: idempotent — safe to re-run.
# Creates the hub org, admin team, registers an OIDC app in Gitea,
# and seeds one sample asset repo.
set -euo pipefail

GITEA="${GITEA_URL:-http://gitea:3001}"
ADMIN="${GITEA_ADMIN_USER:-hubadmin}"
PASS="${GITEA_ADMIN_PASSWORD:-hubadmin_changeme}"
EMAIL="${GITEA_ADMIN_EMAIL:-admin@example.com}"
ORG="${HUB_ORG:-ai-assets}"
TEAM="${HUB_ADMIN_TEAM:-admins}"
CLIENT_ID="ai-asset-hub-web"
CALLBACK="${WEB_CALLBACK_URL:-http://localhost:3000/api/auth/callback/gitea}"

API="$GITEA/api/v1"
AUTH="-u $ADMIN:$PASS"

echo "==> Waiting for Gitea at $GITEA ..."
until curl -sf "$GITEA/api/healthz" > /dev/null; do sleep 2; done
echo "    Gitea is up."

# ── 1. Verify the admin user exists ──────────────────────────────────────────
# The FIRST admin must be created via the Gitea CLI (`gitea admin user create`),
# which scripts/setup.sh does. We can't create it over the API because that
# itself requires authenticating as an existing admin (chicken-and-egg).
echo "==> Checking admin user '$ADMIN' ..."
existing=$(curl -sf $AUTH "$API/user" 2>/dev/null | jq -r '.login' 2>/dev/null || true)
if [ "$existing" != "$ADMIN" ]; then
  echo "    ERROR: cannot authenticate as admin '$ADMIN'."
  echo "    Create it first (or use scripts/setup.sh which does this):"
  echo "      docker compose exec gitea gitea admin user create \\"
  echo "        --admin --username $ADMIN --password '<password>' \\"
  echo "        --email $EMAIL --must-change-password=false"
  exit 1
fi
echo "    Admin '$ADMIN' authenticated."

# ── 2. Create org ────────────────────────────────────────────────────────────
echo "==> Ensuring org '$ORG' ..."
org_exists=$(curl -sf $AUTH "$API/orgs/$ORG" 2>/dev/null | jq -r '.name' 2>/dev/null || true)
if [ "$org_exists" != "$ORG" ]; then
  curl -sf -X POST "$API/orgs" $AUTH \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ORG\",\"visibility\":\"public\",\"description\":\"AI Asset Hub — published assets\"}" \
    > /dev/null
  echo "    Created org."
else
  echo "    Org already exists."
fi

# ── 3. Create admin team ─────────────────────────────────────────────────────
echo "==> Ensuring '$TEAM' team in org '$ORG' ..."
team_id=$(curl -sf $AUTH "$API/orgs/$ORG/teams" 2>/dev/null | jq -r ".[] | select(.name==\"$TEAM\") | .id" || true)
if [ -z "$team_id" ]; then
  team_id=$(curl -sf -X POST "$API/orgs/$ORG/teams" $AUTH \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$TEAM\",\"permission\":\"admin\",\"includes_all_repositories\":true,\"units\":[\"repo.code\",\"repo.issues\",\"repo.ext_issues\",\"repo.wiki\",\"repo.pulls\",\"repo.releases\"]}" \
    | jq -r '.id')
  echo "    Created team (id=$team_id)."
else
  echo "    Team already exists (id=$team_id)."
fi

# Add admin to team
curl -sf -X PUT "$API/teams/$team_id/members/$ADMIN" $AUTH > /dev/null || true

# ── 3b. Create contributors team ─────────────────────────────────────────────
# Non-admin contributors need WRITE access (to create the proposal branch) on
# all org repos. `include_all_repositories:true` grants access to every asset.
echo "==> Ensuring 'contributors' team in org '$ORG' ..."
contrib_id=$(curl -sf $AUTH "$API/orgs/$ORG/teams" 2>/dev/null | jq -r '.[] | select(.name=="contributors") | .id' || true)
if [ -z "$contrib_id" ]; then
  contrib_id=$(curl -sf -X POST "$API/orgs/$ORG/teams" $AUTH \
    -H "Content-Type: application/json" \
    -d '{"name":"contributors","permission":"write","includes_all_repositories":true,"units":["repo.code","repo.issues","repo.pulls","repo.releases"]}' \
    | jq -r '.id')
  echo "    Created contributors team (id=$contrib_id)."
else
  echo "    Contributors team already exists (id=$contrib_id)."
fi

# ── 4. Register OAuth2 app in Gitea (for the web front-end) ─────────────────
echo "==> Registering OAuth2 application '$CLIENT_ID' ..."
existing_app=$(curl -sf $AUTH "$API/user/applications/oauth2" 2>/dev/null \
  | jq -r ".[] | select(.name==\"$CLIENT_ID\") | .client_id" || true)
if [ -z "$existing_app" ]; then
  app_resp=$(curl -sf -X POST "$API/user/applications/oauth2" $AUTH \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$CLIENT_ID\",\"redirect_uris\":[\"$CALLBACK\"],\"confidential_client\":true}")
  client_id=$(echo "$app_resp" | jq -r '.client_id')
  client_secret=$(echo "$app_resp" | jq -r '.client_secret')
  echo ""
  echo "  ┌─────────────────────────────────────────────────────────────────"
  echo "  │  OIDC app registered. Copy these into your .env:"
  echo "  │"
  echo "  │  OIDC_CLIENT_ID=$client_id"
  echo "  │  OIDC_CLIENT_SECRET=$client_secret"
  echo "  └─────────────────────────────────────────────────────────────────"
  echo ""
else
  echo "    OAuth2 app already registered (client_id=$existing_app)."
fi

# ── 5. Seed sample asset repo ────────────────────────────────────────────────
SAMPLE_REPO="pdf-extractor"
echo "==> Ensuring sample asset repo '$ORG/$SAMPLE_REPO' ..."
repo_exists=$(curl -sf $AUTH "$API/repos/$ORG/$SAMPLE_REPO" 2>/dev/null | jq -r '.name' 2>/dev/null || true)
if [ "$repo_exists" != "$SAMPLE_REPO" ]; then
  # Create repo under org with auto_init so a main branch + first commit exist
  # before the contents API is used (it needs a base branch to commit against).
  curl -sf -X POST "$API/orgs/$ORG/repos" $AUTH \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$SAMPLE_REPO\",\"description\":\"Extract and summarise tables from PDF files\",\"private\":false,\"auto_init\":true,\"default_branch\":\"main\"}" \
    > /dev/null
  echo "    Created repo."
else
  echo "    Repo already exists — ensuring seed files are present."
fi

# Seed files idempotently (runs whether or not the repo was just created).
# new files → POST; existing files → PUT with the current sha.
push_file() {
  local path="$1"
  local src="/seed-asset/$path"
  local content sha method body
  content=$(base64 < "$src" | tr -d '\n')
  # `|| true`: a 404 here (file not yet present) must NOT trip `set -e`/pipefail.
  sha=$(curl -sf $AUTH "$API/repos/$ORG/$SAMPLE_REPO/contents/$path?ref=main" 2>/dev/null | jq -r '.sha // empty' || true)
  if [ -n "$sha" ]; then
    method="PUT"
    body="{\"message\":\"Seed $path\",\"content\":\"$content\",\"branch\":\"main\",\"sha\":\"$sha\"}"
  else
    method="POST"
    body="{\"message\":\"Seed $path\",\"content\":\"$content\",\"branch\":\"main\"}"
  fi
  curl -sf -X "$method" "$API/repos/$ORG/$SAMPLE_REPO/contents/$path" $AUTH \
    -H "Content-Type: application/json" -d "$body" > /dev/null \
    && echo "    Pushed $path" || echo "    WARNING: failed to push $path"
}
push_file "hub.json"
push_file "SKILL.md"
push_file "README.md"

# Tag 1.0.0 (matches hub.json version, so download/install refs resolve).
existing_tag=$(curl -sf $AUTH "$API/repos/$ORG/$SAMPLE_REPO/tags/1.0.0" 2>/dev/null | jq -r '.name // empty' || true)
if [ -z "$existing_tag" ]; then
  head_sha=$(curl -sf $AUTH "$API/repos/$ORG/$SAMPLE_REPO/git/refs/heads/main" 2>/dev/null | jq -r '.[0].object.sha // empty' || true)
  if [ -n "$head_sha" ]; then
    curl -sf -X POST "$API/repos/$ORG/$SAMPLE_REPO/tags" $AUTH \
      -H "Content-Type: application/json" \
      -d "{\"tag_name\":\"1.0.0\",\"target\":\"$head_sha\",\"message\":\"Initial release\"}" > /dev/null \
      && echo "    Tagged 1.0.0" || echo "    WARNING: failed to tag 1.0.0"
  fi
else
  echo "    Tag 1.0.0 already exists."
fi

echo ""
echo "==> Bootstrap complete."
echo "    Hub org:  $GITEA/$ORG"
echo "    Admin UI: $GITEA (user: $ADMIN)"
echo ""
