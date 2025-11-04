#!/bin/bash
set -euo pipefail

# Extract contributor info
CONTRIBUTOR_EMAIL=$(node -p "require('./contribution.json').contributorEmail || 'anonymous'")
CONTRIBUTOR_GITHUB=$(node -p "require('./contribution.json').contributorGithub || ''")
TIMESTAMP=$(date +%s)

# Determine action and descriptive info based on what's in the payload
LANGS_TO_ADD=$(node -p "require('./contribution.json').languagesToAdd?.length || 0")
LANGS_TO_EDIT=$(node -p "require('./contribution.json').languagesToEdit?.length || 0")
NEW_REFS=$(node -p "require('./contribution.json').newReferences?.length || 0")
EDGE_UPDATES=$(node -p "require('./contribution.json').edgeUpdates?.length || 0")

# Determine primary action and slug
if [[ "$LANGS_TO_ADD" -gt 0 ]]; then
  ACTION="add"
  LANG_SLUG=$(node -p "require('./contribution.json').languagesToAdd[0]?.slug || 'language'")
  LANG_NAME=$(node -p "require('./contribution.json').languagesToAdd[0]?.data?.name || 'language'")
elif [[ "$LANGS_TO_EDIT" -gt 0 ]]; then
  ACTION="edit"
  LANG_SLUG=$(node -p "require('./contribution.json').languagesToEdit[0]?.slug || 'language'")
  LANG_NAME=$(node -p "require('./contribution.json').languagesToEdit[0]?.data?.name || 'language'")
elif [[ "$EDGE_UPDATES" -gt 0 ]]; then
  ACTION="relations"
  LANG_SLUG="relations"
  LANG_NAME="relations update"
elif [[ "$NEW_REFS" -gt 0 ]]; then
  ACTION="references"
  LANG_SLUG="references"
  LANG_NAME="references update"
else
  ACTION="update"
  LANG_SLUG="data"
  LANG_NAME="data update"
fi

BRANCH_NAME="contribution/${ACTION}-${LANG_SLUG}-${TIMESTAMP}"

git checkout -b "$BRANCH_NAME"

git config user.name "bot"
git config user.email "b@o.t"

git add src/lib/data/

declare -a LABELS=("data-contribution" "needs-review")
COMMIT_MSG="Data contribution: ${ACTION} ${LANG_SLUG}"
if [[ -n "$CONTRIBUTOR_GITHUB" ]]; then
  COMMIT_MSG+=" (by @${CONTRIBUTOR_GITHUB})"
fi

git commit -m "$COMMIT_MSG"

git push origin "$BRANCH_NAME"

if [[ "$ACTION" == "add" ]]; then
  PR_TITLE="Add new language: ${LANG_NAME}"
elif [[ "$ACTION" == "relations" ]]; then
  PR_TITLE="Update knowledge map relationships"
else
  PR_TITLE="Update language: ${LANG_NAME}"
fi

PR_BODY="## Data Contribution

**Contributor Email:** ${CONTRIBUTOR_EMAIL}

### Changes Summary
- Languages added: ${LANGS_TO_ADD}
- Languages edited: ${LANGS_TO_EDIT}
- New references: ${NEW_REFS}
- Edge updates: ${EDGE_UPDATES}"

if [[ "$ACTION" != "relations" ]] && [[ "$ACTION" != "references" ]]; then
  PR_BODY+="

**Primary Language:** ${LANG_NAME} (\`${LANG_SLUG}\`)"
fi

if [[ -n "$CONTRIBUTOR_GITHUB" ]]; then
  PR_BODY+="\n\n**GitHub:** @${CONTRIBUTOR_GITHUB}"
fi

PR_BODY+="\n\n### Files Changed
\n\n\`\`\`\n$(git diff --name-only main..."$BRANCH_NAME")\n\`\`\`
\n### Review Checklist
- [ ] Data accuracy verified
- [ ] References valid
- [ ] No syntax errors
- [ ] Builds successfully
- [ ] Graph renders correctly

*This PR was automatically generated from a community contribution.*"

if [[ -n "$CONTRIBUTOR_GITHUB" ]]; then
  PR_TITLE+=" (by @${CONTRIBUTOR_GITHUB})"
fi

export GH_TOKEN=${GH_TOKEN:-$CONTRIBUTION_TOKEN}

# Create PR without labels first (labels may not exist)
gh pr create \
  --title "$PR_TITLE" \
  --body "$PR_BODY" \
  --base main \
  --head "$BRANCH_NAME" || {
    echo "Failed to create PR"
    exit 1
  }

# Try to add labels if they exist, but don't fail if they don't
for label in "${LABELS[@]}"; do
  gh pr edit --add-label "$label" "$BRANCH_NAME" 2>/dev/null || echo "Note: Label '$label' not found, skipping"
done
