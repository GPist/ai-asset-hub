#!/usr/bin/env bash
# Bootstrap script: idempotent — safe to re-run.
# Creates the hub org, admin team, registers an OIDC app in Gitea,
# and seeds one sample asset repo.
set -euo pipefail

GITEA="${GITEA_URL:-http://gitea:3001}"
ADMIN="${GITEA_ADMIN_USER:-hubadmin}"
PASS="${GITEA_ADMIN_PASSWORD:-hubadmin_changeme}"
EMAIL="${GITEA_ADMIN_EMAIL:-admin@example.com}"
ORG="${HUB_ORG:-assets}"
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
    -d "{\"name\":\"$TEAM\",\"permission\":\"owner\",\"units\":[\"repo.code\",\"repo.issues\",\"repo.ext_issues\",\"repo.wiki\",\"repo.pulls\",\"repo.releases\"]}" \
    | jq -r '.id')
  echo "    Created team (id=$team_id)."
else
  echo "    Team already exists (id=$team_id)."
fi

# Add admin to team
curl -sf -X PUT "$API/teams/$team_id/members/$ADMIN" $AUTH > /dev/null || true

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
  # Create repo under org
  curl -sf -X POST "$API/orgs/$ORG/repos" $AUTH \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$SAMPLE_REPO\",\"description\":\"Extract and summarise tables from PDF files\",\"private\":false,\"auto_init\":false}" \
    > /dev/null
  echo "    Created repo."

  # Push seed files via contents API
  push_file() {
    local path="$1"
    local src="/seed-asset/$path"
    local content
    content=$(base64 < "$src" | tr -d '\n')
    curl -sf -X POST "$API/repos/$ORG/$SAMPLE_REPO/contents/$path" $AUTH \
      -H "Content-Type: application/json" \
      -d "{\"message\":\"Initial commit\",\"content\":\"$content\"}" > /dev/null
    echo "    Pushed $path"
  }
  push_file "hub.json"
  push_file "SKILL.md"
  push_file "README.md"

  # Tag v1.0.0 on HEAD
  sha=$(curl -sf $AUTH "$API/repos/$ORG/$SAMPLE_REPO/git/refs/heads/main" | jq -r '.[0].object.sha // empty')
  if [ -n "$sha" ]; then
    curl -sf -X POST "$API/repos/$ORG/$SAMPLE_REPO/tags" $AUTH \
      -H "Content-Type: application/json" \
      -d "{\"tag_name\":\"v1.0.0\",\"target\":\"$sha\",\"message\":\"Initial release\"}" > /dev/null || true
    echo "    Tagged v1.0.0"
  fi
else
  echo "    Sample repo already exists."
fi

echo ""
echo "==> Bootstrap complete."
echo "    Hub org:  $GITEA/$ORG"
echo "    Admin UI: $GITEA (user: $ADMIN)"
echo ""
