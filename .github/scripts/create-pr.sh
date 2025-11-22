#!/bin/bash
set -euo pipefail

mapfile -t META < <(node <<'EOF'
const payload = require('./contribution.json');
const contributor = payload.contributor || {};
const fields = [
	contributor.email || 'anonymous',
	contributor.github || '',
	contributor.note || '',
	payload.submissionId || '',
	payload.supersedesSubmissionId || ''
];
for (const value of fields) {
	console.log(String(value));
}
EOF
)

CONTRIBUTOR_EMAIL=${META[0]}
CONTRIBUTOR_GITHUB=${META[1]}
CONTRIBUTOR_NOTE=${META[2]}
SUBMISSION_ID=${META[3]}
SUPERSEDES_SUBMISSION_ID=${META[4]}


sanitize_slug() {
	local raw="$1"
	local cleaned
	cleaned=$(echo "$raw" | tr -c '[:alnum:]._- ' '-')
	cleaned=${cleaned// /-}
	cleaned=${cleaned//--/-}
	cleaned=${cleaned#-}
	cleaned=${cleaned%-}
	if [[ -z "$cleaned" ]]; then
		cleaned=$(date +%s)
	fi
	printf '%s' "$cleaned"
}

RAW_SLUG=${SUBMISSION_ID:-$(date +%s)}
BRANCH_SLUG=$(sanitize_slug "$RAW_SLUG")
BRANCH_NAME="contribution/${BRANCH_SLUG}"

declare -a LABELS=("data-contribution" "needs-review")

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
	git checkout "$BRANCH_NAME"
else
	git checkout -b "$BRANCH_NAME"
fi

git config user.name "bot"
git config user.email "b@o.t"

git add src/lib/data/

if git diff --cached --quiet; then
	echo "ERROR: No files were modified by the contribution generation script."
	cat contribution.json
	exit 1
fi

COMMIT_MSG="Data contribution ${BRANCH_SLUG}"
if [[ -n "$CONTRIBUTOR_GITHUB" ]]; then
	COMMIT_MSG+=" (by @${CONTRIBUTOR_GITHUB})"
fi

git commit -m "$COMMIT_MSG"

git push origin "$BRANCH_NAME"

PR_TITLE="Data contribution ${BRANCH_SLUG}"
if [[ -n "$CONTRIBUTOR_GITHUB" ]]; then
	PR_TITLE+=" (by @${CONTRIBUTOR_GITHUB})"
fi

export GH_TOKEN=${GH_TOKEN:-$CONTRIBUTION_TOKEN}

PR_BODY_FILE=$(mktemp)
cat > "$PR_BODY_FILE" <<EOF
## Submission Details

- Submission ID: ${SUBMISSION_ID:-${BRANCH_SLUG}}
- Contributor Email: ${CONTRIBUTOR_EMAIL}
EOF

if [[ -n "$CONTRIBUTOR_GITHUB" ]]; then
	echo "- GitHub: @${CONTRIBUTOR_GITHUB}" >> "$PR_BODY_FILE"
fi

if [[ -n "$SUPERSEDES_SUBMISSION_ID" ]]; then
	echo "- Supersedes Submission ID: ${SUPERSEDES_SUBMISSION_ID}" >> "$PR_BODY_FILE"
fi

if [[ -n "$CONTRIBUTOR_NOTE" ]]; then
	cat >> "$PR_BODY_FILE" <<EOF

### Contributor Note
${CONTRIBUTOR_NOTE}
EOF
fi

cat >> "$PR_BODY_FILE" <<EOF

## Automation

This PR was generated from the ordered contribution queue. Validation and build checks already ran in the workflow before opening this pull request.

*This PR was automatically generated from a community contribution.*
EOF

gh pr create \
	--title "$PR_TITLE" \
	--body-file "$PR_BODY_FILE" \
	--base main \
	--head "$BRANCH_NAME" || {
		rm "$PR_BODY_FILE"
		echo "Failed to create PR"
		exit 1
	}

rm "$PR_BODY_FILE"

NEW_PR_NUMBER=$(gh pr view "$BRANCH_NAME" --json number --jq '.number')

if [[ -n "$SUPERSEDES_SUBMISSION_ID" ]]; then
	SUPERSEDED_PR=$(gh pr list --state open --search "${SUPERSEDES_SUBMISSION_ID} in:body" --json number --jq '.[0].number' 2>/dev/null || true)
	if [[ -n "$SUPERSEDED_PR" && "$SUPERSEDED_PR" != "null" && "$SUPERSEDED_PR" != "$NEW_PR_NUMBER" ]]; then
		NEW_PR_URL=$(gh pr view "$BRANCH_NAME" --json url --jq '.url')
		gh pr close "$SUPERSEDED_PR" --comment "Superseded by ${NEW_PR_URL}."
	else
		echo "No open PR found for Supersedes Submission ID ${SUPERSEDES_SUBMISSION_ID}" >&2
	fi
fi

for label in "${LABELS[@]}"; do
	gh pr edit --add-label "$label" "$BRANCH_NAME" 2>/dev/null || echo "Note: Label '$label' not found, skipping"
done
