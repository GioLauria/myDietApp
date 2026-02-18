#!/usr/bin/env bash
set -euo pipefail
# Usage: check-signed-commits.sh [remote]
remote=${1:-origin}
branch=$(git rev-parse --abbrev-ref HEAD)
remote_ref=$(git rev-parse --verify "${remote}/${branch}" 2>/dev/null || true)
if [ -n "$remote_ref" ]; then
  rev_range="${remote}/${branch}..HEAD"
else
  rev_range="HEAD"
fi
commits=$(git rev-list "$rev_range")
if [ -z "$commits" ]; then
  # Nothing to push
  exit 0
fi
unsigned_found=0
while read -r commit; do
  status=$(git show -s --format=%G? "$commit" 2>/dev/null || echo "N")
  case "$status" in
    G) ;; # good signature
    R) ;; # good signature, but untrusted
    # treat any other status as unsigned/invalid
    *)
      printf "Unsigned or invalid signature: %s %s\n" "$commit" "$(git show -s --format=%s $commit)"
      unsigned_found=1
      ;;
  esac
done <<EOF
$commits
EOF
if [ "$unsigned_found" -ne 0 ]; then
  exit 1
fi
exit 0
