#!/usr/bin/env bash
# One-command setup for AI Asset Hub.
#   ./scripts/setup.sh           # production-ish (no demo IdP)
#   ./scripts/setup.sh --demo    # include Dex demo IdP
#
# Idempotent: generates .env with random secrets on first run, brings up Gitea,
# generates an admin token, wires it back into .env, then starts bootstrap + web.
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE_ARGS=""
if [ "${1:-}" = "--demo" ]; then PROFILE_ARGS="--profile demo"; fi

# ── 1. Generate .env if missing ──────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "==> Generating .env with random secrets"
  rnd() { openssl rand -hex 24; }
  cat > .env <<EOF
GITEA_URL=http://localhost:3001
GITEA_PUBLIC_URL=http://localhost:3001
GITEA_DOMAIN=localhost
GITEA_SECRET_KEY=$(rnd)
GITEA_INTERNAL_TOKEN=$(rnd)
GITEA_JWT_SECRET=$(rnd)
GITEA_ADMIN_USER=hubadmin
GITEA_ADMIN_PASSWORD=$(rnd)
GITEA_ADMIN_EMAIL=admin@example.com
HUB_ORG=ai-assets
HUB_ADMIN_TEAM=admins
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(rnd)
OIDC_ISSUER=http://localhost:3001
OIDC_CLIENT_ID=ai-asset-hub-web
OIDC_CLIENT_SECRET=placeholder_set_by_bootstrap
POSTGRES_PASSWORD=$(rnd)
GITEA_ADMIN_TOKEN=
EOF
  echo "    .env created."
else
  echo "==> Using existing .env"
fi

# shellcheck disable=SC1091
set -a; . ./.env; set +a

# ── 2. Bring up DB + Gitea ───────────────────────────────────────────────────
echo "==> Starting Postgres + Gitea"
docker compose up -d db gitea

echo "==> Waiting for Gitea to be healthy"
until [ "$(docker compose ps gitea --format '{{.Health}}' 2>/dev/null)" = "healthy" ]; do
  sleep 3
done
echo "    Gitea healthy."

# ── 3a. Create the initial admin user (idempotent) ───────────────────────────
# Run as the `git` user — Gitea refuses to run its CLI as root.
echo "==> Ensuring admin user '${GITEA_ADMIN_USER:-hubadmin}'"
if docker compose exec -T -u git gitea gitea admin user list 2>/dev/null \
     | awk 'NR>1{print $2}' | grep -qx "${GITEA_ADMIN_USER:-hubadmin}"; then
  echo "    Admin user already exists (ok)."
else
  docker compose exec -T -u git gitea gitea admin user create \
    --admin \
    --username "${GITEA_ADMIN_USER:-hubadmin}" \
    --password "${GITEA_ADMIN_PASSWORD:?set GITEA_ADMIN_PASSWORD in .env}" \
    --email "${GITEA_ADMIN_EMAIL:-admin@example.com}" \
    --must-change-password=false \
    && echo "    Admin user created." \
    || { echo "    ERROR: admin user creation failed."; exit 1; }
fi

# ── 3b. Generate an admin token if we don't have one ─────────────────────────
if ! grep -q '^GITEA_ADMIN_TOKEN=.\+' .env; then
  echo "==> Generating Gitea admin access token"
  TOKEN=$(docker compose exec -T -u git gitea gitea admin user generate-access-token \
    --username "${GITEA_ADMIN_USER:-hubadmin}" --raw --scopes all \
    --token-name "hub-admin-$(date +%s)" 2>/dev/null | tail -1 | tr -d '[:space:]')
  if [ -n "$TOKEN" ]; then
    # Replace the empty GITEA_ADMIN_TOKEN line
    tmp=$(mktemp)
    sed "s|^GITEA_ADMIN_TOKEN=.*|GITEA_ADMIN_TOKEN=$TOKEN|" .env > "$tmp" && mv "$tmp" .env
    # Re-export so the value we pass to `docker compose up` below isn't the
    # empty one we sourced from .env earlier (shell env overrides the .env file).
    export GITEA_ADMIN_TOKEN="$TOKEN"
    echo "    Admin token written to .env."
  else
    echo "    WARNING: could not generate admin token automatically."
  fi
else
  # Already had a token in .env; make sure it's exported for compose below.
  export GITEA_ADMIN_TOKEN
fi

# ── 4. Bootstrap (org, team, OIDC app, sample asset) + web ──────────────────
echo "==> Running bootstrap + starting web"
# shellcheck disable=SC2086
docker compose $PROFILE_ARGS up -d bootstrap web

echo ""
echo "==> Done."
echo "    Hub:   http://localhost:3000"
echo "    Gitea: http://localhost:3001 (admin: ${GITEA_ADMIN_USER:-hubadmin})"
if [ -n "$PROFILE_ARGS" ]; then
  echo "    Demo login (Dex): alice@example.com / password"
fi
echo ""
echo "    NOTE: copy the OIDC_CLIENT_SECRET printed by the bootstrap container"
echo "    into .env, then: docker compose up -d web"
echo "    (see: docker compose logs bootstrap)"
