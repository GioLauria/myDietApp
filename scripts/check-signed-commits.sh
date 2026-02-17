#!/usr/bin/env bash
# Verify commit signatures for commits on the current branch compared to origin/master
set -e
REMOTE=${1:-origin}
BASE_REF="${REMOTE}/master"
if git ls-remote --exit-code ${REMOTE} &>/dev/null; then
  RANGE="${BASE_REF}..HEAD"
else
  # remote not available; check the last 100 commits
  RANGE="HEAD~100..HEAD"
fi

echo "Verifying commit signatures in range: $RANGE"
BAD=0
for rev in $(git rev-list $RANGE); do
  # git verify-commit returns non-zero for unsigned or bad signatures
  if ! git verify-commit $rev >/dev/null 2>&1; then
    echo "Unsigned or invalid signature: $rev -> $(git show -s --format='%an: %s' $rev)"
    BAD=1
  fi
done

if [ "$BAD" -ne 0 ]; then
  echo "One or more commits are not signed or have invalid signatures."
  exit 2
fi

echo "All commits in range have valid GPG signatures."
