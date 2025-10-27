# Preview & PR Management Plan

## Preview Feature Design

### Concept
Instead of creating a separate preview page, reuse the main page (`/`) to show enqueued changes. This provides a familiar interface and ensures consistency.

### Implementation

#### 1. Data Storage
- Use **localStorage** to persist enqueued changes across page navigation
- Key: `kcm-enqueued-changes`
- Value: JSON object containing:
  ```typescript
  {
    languagesToAdd: LanguageToAdd[]
    languagesToEdit: LanguageToAdd[]
    relationships: RelationshipEntry[]
    newReferences: string[]
    customTags: TagInput[]
    timestamp: number  // for expiration
  }
  ```

#### 2. Main Page Modifications
- Add state: `showPreviewMode: boolean`
- Check localStorage on mount for enqueued changes
- If found, show toggle switch: "Current Data" ⇄ "With My Changes"
- Merge enqueued data with existing data when preview mode is active

#### 3. Data Merging Logic
```typescript
function mergeEnqueuedData(baseData, enqueuedChanges) {
  return {
    languages: [
      ...baseData.languages,
      ...enqueuedChanges.languagesToAdd,
      // Override edited languages
      ...enqueuedChanges.languagesToEdit
    ],
    edges: mergeEdges(baseData.edges, enqueuedChanges.relationships),
    // ... etc
  }
}
```

#### 4. Visual Indicators
When in preview mode, show:
- **New languages**: Green glow/border
- **Edited languages**: Blue glow/border
- **New/modified relationships**: Orange/yellow edges
- **Preview mode banner**: Top of page with "Viewing with your changes" + toggle

#### 5. Contribute Page Flow
1. User enqueues changes
2. Clicks "Preview Changes" button
3. Button saves data to localStorage
4. Redirects to `/` with query param `?preview=true`
5. Main page detects param + localStorage data
6. Enters preview mode automatically

#### 6. Persistence & Cleanup
- Expire localStorage data after 24 hours
- Clear on successful PR submission
- Option to "Discard Draft" in preview banner

---

## PR Management with GitHub Pages

### Architecture: Path-Based Staging

**Production**: `kcm.kahdian.com/`  
**PR Preview**: `kcm.kahdian.com/{pr-number}/`

### Why Path-Based Instead of Subdomain
- **DNS Limitation**: No wildcard subdomain control at `*.kcm.kahdian.com`
- **Simpler Setup**: Single domain, multiple paths
- **No SSL Issues**: One certificate covers all paths

### Implementation Strategy

#### Option A: Manual GitHub Pages Branches
**Structure:**
```
gh-pages (production)     → kcm.kahdian.com/
gh-pages-pr-123          → kcm.kahdian.com/123/
gh-pages-pr-456          → kcm.kahdian.com/456/
```

**GitHub Actions Workflow:**
```yaml
name: PR Preview Deploy

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Install & Build
        run: |
          npm ci
          npm run build
      - name: Deploy to gh-pages branch
        run: |
          git checkout --orphan gh-pages-pr-${{ github.event.pull_request.number }}
          cp -r build/* .
          git add .
          git commit -m "Deploy PR #${{ github.event.pull_request.number }}"
          git push origin gh-pages-pr-${{ github.event.pull_request.number }}
```

**Challenges:**
- GitHub Pages only serves ONE branch
- Can't have multiple path-based deployments from branches
- Would need custom server or workaround

#### Option B: Single gh-pages Branch with Subdirectories (Recommended)

**Structure:**
```
gh-pages/
  ├── index.html              (production)
  ├── _app/                   (production assets)
  ├── 123/                    (PR #123 preview)
  │   ├── index.html
  │   └── _app/
  └── 456/                    (PR #456 preview)
      ├── index.html
      └── _app/
```

**GitHub Actions Workflow:**
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for gh-pages
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Checkout gh-pages
        run: |
          git fetch origin gh-pages || git checkout --orphan gh-pages
          git checkout gh-pages
      
      - name: Deploy to production (main branch)
        if: github.event_name == 'push'
        run: |
          # Clear root (keep PR folders)
          find . -maxdepth 1 ! -name '.' ! -name '..' ! -name '.git' ! -name '[0-9]*' -exec rm -rf {} +
          cp -r build/* .
          git add .
          git commit -m "Deploy production from ${{ github.sha }}"
          git push origin gh-pages
      
      - name: Deploy PR preview
        if: github.event_name == 'pull_request'
        run: |
          PR_NUM=${{ github.event.pull_request.number }}
          rm -rf $PR_NUM
          mkdir -p $PR_NUM
          cp -r build/* $PR_NUM/
          git add $PR_NUM
          git commit -m "Deploy PR #$PR_NUM preview"
          git push origin gh-pages
```

**SvelteKit Configuration Needed:**
```javascript
// svelte.config.js
const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';
const prNumber = process.env.PR_NUMBER;

export default {
  kit: {
    paths: {
      base: isPR ? `/${prNumber}` : ''
    },
    // ... rest of config
  }
};
```

**Pros:**
- Single GitHub Pages site
- Multiple path-based previews
- Simple DNS (just point to GitHub Pages)
- No subdomain setup needed

**Cons:**
- Requires base path configuration in build
- Manual cleanup of old PR folders
- All previews share same domain

#### Option C: GitHub Actions + Separate Static Host

Use GitHub Actions to build, then deploy previews to:
- **Netlify Drop** (manual upload)
- **Surge.sh** (CLI-based static hosting)
- **Your own static server**

**Not recommended** - adds complexity without benefits over Option B.

---

## Recommended Implementation

### Phase 1: Preview Feature
1. Add localStorage utilities for enqueued data
2. Modify main page to detect and merge preview data
3. Add visual indicators (green/blue glows, preview banner)
4. Add "Preview Changes" button to contribute page
5. Test with sample contributions

### Phase 2: PR Setup (GitHub Pages)
1. Update `svelte.config.js` for base path support
2. Create GitHub Actions workflow for path-based deployment
3. Test with manual PR
4. Document cleanup process for old PRs
5. Add PR preview link to template

### Workflow After Setup
```
1. Contributor fills out form
2. Clicks "Preview Changes"
3. Redirected to / in preview mode
4. Reviews changes visually on graph
5. Returns to /contribute
6. Clicks "Submit Contribution"
7. Creates PR on GitHub
8. GitHub Action builds and deploys to /{pr-number}/
9. Maintainer reviews at kcm.kahdian.com/{pr-number}/
10. If approved, merges PR
11. GitHub Action deploys to production (/)
```

---

## Technical Considerations

### Base Path Handling
SvelteKit apps need base path configured for subdirectory deployment:
```typescript
// All links must be relative to base
import { base } from '$app/paths';
<a href="{base}/contribute">Contribute</a>
```

### Asset Paths
- Images: `{base}/image.png`
- Data files: Loaded dynamically with base path

### Cleanup Strategy
Add workflow to delete PR folders when PR is closed:
```yaml
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Remove PR folder
        run: |
          git checkout gh-pages
          rm -rf ${{ github.event.pull_request.number }}
          git commit -m "Remove PR #${{ github.event.pull_request.number }} preview"
          git push
```

---

## Open Questions / Future Decisions

1. **Preview Data Expiration**: 24 hours? 7 days?
2. **Max PR Previews**: Limit to 10 most recent? Auto-cleanup after 30 days?
3. **Preview Mode Styling**: What colors for new/edited elements?
4. **Mobile Experience**: How to handle preview mode toggle on small screens?

---

**Last Updated**: October 26, 2025
