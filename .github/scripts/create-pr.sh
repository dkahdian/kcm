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
  LANG_SLUG=$(node -p "require('./contribution.json').languagesToAdd[0]?.id || 'language'")
  LANG_NAME=$(node -p "require('./contribution.json').languagesToAdd[0]?.name || 'language'")
elif [[ "$LANGS_TO_EDIT" -gt 0 ]]; then
  ACTION="edit"
  LANG_SLUG=$(node -p "require('./contribution.json').languagesToEdit[0]?.id || 'language'")
  LANG_NAME=$(node -p "require('./contribution.json').languagesToEdit[0]?.name || 'language'")
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

# Check if there are any changes to commit
if git diff --cached --quiet; then
  echo "ERROR: No files were modified by the contribution generation script."
  echo "This likely means the contribution data was invalid or already exists."
  echo "Contribution payload:"
  cat contribution.json
  exit 1
fi

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
elif [[ "$ACTION" == "references" ]]; then
  PR_TITLE="Add new references"
else
  PR_TITLE="Update language: ${LANG_NAME}"
fi

if [[ -n "$CONTRIBUTOR_GITHUB" ]]; then
  PR_TITLE+=" (by @${CONTRIBUTOR_GITHUB})"
fi

export GH_TOKEN=${GH_TOKEN:-$CONTRIBUTION_TOKEN}

# Get list of changed files
CHANGED_FILES=$(git diff --name-only main..."$BRANCH_NAME")

# Build PR body using a temporary file for proper formatting
PR_BODY_FILE=$(mktemp)
cat > "$PR_BODY_FILE" <<EOF
## Data Contribution

**Contributor Email:** ${CONTRIBUTOR_EMAIL}
EOF

if [[ -n "$CONTRIBUTOR_GITHUB" ]]; then
  echo "**GitHub:** @${CONTRIBUTOR_GITHUB}" >> "$PR_BODY_FILE"
  echo "" >> "$PR_BODY_FILE"
fi

cat >> "$PR_BODY_FILE" <<EOF

### Changes Summary
- Languages added: ${LANGS_TO_ADD}
- Languages edited: ${LANGS_TO_EDIT}
- New references: ${NEW_REFS}
- Edge updates: ${EDGE_UPDATES}
EOF

if [[ "$ACTION" != "relations" ]] && [[ "$ACTION" != "references" ]]; then
  cat >> "$PR_BODY_FILE" <<EOF

**Primary Language:** ${LANG_NAME} (\`${LANG_SLUG}\`)
EOF
fi

cat >> "$PR_BODY_FILE" <<EOF

### Files Changed

\`\`\`
${CHANGED_FILES}
\`\`\`

### Review Checklist
- [ ] Data accuracy verified
- [ ] References valid
- [ ] No syntax errors
- [ ] Builds successfully
- [ ] Graph renders correctly

*This PR was automatically generated from a community contribution.*
EOF

# Create PR without labels first (labels may not exist)
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

# Try to add labels if they exist, but don't fail if they don't
for label in "${LABELS[@]}"; do
  gh pr edit --add-label "$label" "$BRANCH_NAME" 2>/dev/null || echo "Note: Label '$label' not found, skipping"
done
