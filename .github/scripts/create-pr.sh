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
	cleaned=$(echo "$raw" | tr -c '[:alnum:]._ -' '-')
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

TITLE_JSON=$(printf '%s' "$PR_TITLE" | jq -Rs .)
HEAD_JSON=$(printf '%s' "$BRANCH_NAME" | jq -Rs .)
BODY_JSON=$(jq -Rs . < "$PR_BODY_FILE")

REQUEST_PAYLOAD=$(cat <<EOF
{
  "title": ${TITLE_JSON},
  "head": ${HEAD_JSON},
  "base": "main",
  "body": ${BODY_JSON}
}
EOF
)

PR_RESPONSE=$(printf '%s' "$REQUEST_PAYLOAD" | gh api "repos/${GITHUB_REPOSITORY}/pulls" --method POST --input -)

rm "$PR_BODY_FILE"

NEW_PR_NUMBER=$(echo "$PR_RESPONSE" | jq '.number')
NEW_PR_URL=$(echo "$PR_RESPONSE" | jq -r '.html_url')

if [[ -z "$NEW_PR_NUMBER" || "$NEW_PR_NUMBER" == "null" ]]; then
	echo "Failed to create PR" >&2
	exit 1
fi

if [[ -n "$SUPERSEDES_SUBMISSION_ID" ]]; then
	QUERY="repo:${GITHUB_REPOSITORY} state:open is:pr ${SUPERSEDES_SUBMISSION_ID} in:body"
	SUPERSEDED_PR=$(gh api search/issues -f q="$QUERY" --jq '.items[0].number // empty' 2>/dev/null || true)
	if [[ -n "$SUPERSEDED_PR" && "$SUPERSEDED_PR" != "$NEW_PR_NUMBER" ]]; then
		CLOSE_PAYLOAD=$(jq -n '{state: "closed"}')
		printf '%s' "$CLOSE_PAYLOAD" | gh api "repos/${GITHUB_REPOSITORY}/pulls/${SUPERSEDED_PR}" --method PATCH --input - >/dev/null
		COMMENT_PAYLOAD=$(jq -n --arg body "Superseded by ${NEW_PR_URL}." '{body: $body}')
		printf '%s' "$COMMENT_PAYLOAD" | gh api "repos/${GITHUB_REPOSITORY}/issues/${SUPERSEDED_PR}/comments" --method POST --input - >/dev/null
	else
		echo "No open PR found for Supersedes Submission ID ${SUPERSEDES_SUBMISSION_ID}" >&2
	fi
fi

for label in "${LABELS[@]}"; do
	LABEL_PAYLOAD=$(jq -n --arg label "$label" '{labels: [$label]}')
	printf '%s' "$LABEL_PAYLOAD" | gh api "repos/${GITHUB_REPOSITORY}/issues/${NEW_PR_NUMBER}/labels" --method POST --input - >/dev/null || \
		echo "Note: Label '$label' not found, skipping"
done
