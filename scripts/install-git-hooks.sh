#!/usr/bin/env bash
# Installs a pre-push hook that runs the signed-commit checker.
set -e
HOOK_DEST=".git/hooks/pre-push"
SCRIPT_PATH="$(pwd)/scripts/check-signed-commits.sh"

if [ ! -d .git ]; then
  echo "This script must be run from the repository root (where .git lives)."
  exit 1
fi

cat > "$HOOK_DEST" <<'HOOK'
#!/usr/bin/env bash
# Pre-push hook: verify that commits to be pushed are signed
#!/usr/bin/env bash
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
"$PROJECT_ROOT/scripts/check-signed-commits.sh" origin || {
  echo "Push aborted: unsigned commits detected."
  exit 1
}
HOOK

chmod +x "$HOOK_DEST"
chmod +x "$SCRIPT_PATH"

echo "Installed pre-push hook -> $HOOK_DEST"
