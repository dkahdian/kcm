#!/bin/bash
set -euo pipefail

ACTION=$(node -p "require('./contribution.json').action")
LANG_SLUG=$(node -p "require('./contribution.json').languageSlug")
LANG_NAME=$(node -p "const data=require('./contribution.json'); data.languageData?.name || (data.action === 'relations' ? 'relations update' : data.languageSlug)")
CONTRIBUTOR_EMAIL=$(node -p "require('./contribution.json').contributorEmail || 'anonymous'")
CONTRIBUTOR_GITHUB=$(node -p "require('./contribution.json').contributorGithub || ''")
TIMESTAMP=$(date +%s)

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

**Action:** ${ACTION}
**Contributor Email:** ${CONTRIBUTOR_EMAIL}"

if [[ "$ACTION" == "relations" ]]; then
  PR_BODY+="
**Scope:** Relationship updates"
else
  PR_BODY+="
**Language ID:** ${LANG_SLUG}"
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

gh pr create \
  --title "$PR_TITLE" \
  --body "$PR_BODY" \
  --base main \
  --head "$BRANCH_NAME" \
  --label "${LABELS[0]}" --label "${LABELS[1]}"
