# tractable-circuit-zoo
Tractable Circuit Zoo interactive website project for StarAI UCLA

This project is meant to serve as a helpful tool for researchers and engineers working with tractable circuits and knowledge compilation. It provides an interactive, graphical interface to visualize various representation languages.

This project is a modernization of the original Knowledge Compilation Map created by Adnan Darwiche and Pierre Marquis. The original paper can be found here: [Knowledge Compilation Map](https://arxiv.org/pdf/1106.1819)

# Logistical overview
This project is built using the following technologies:
- Svelte + SvelteKit + TypeScript for the UI
- TailwindCSS for styling
- Vite as the build tool
- Cytoscape.js + Dagre for graph visualization
- JSON files will store the data for the knowledge compilation languages and their properties.

# Technical overview
The project will support the following features:
- Interactive graph visualization, with styled edges representing the succinctness relations between different knowledge compilation languages.
- Clickable nodes that provide detailed information about each language, including its properties and references to relevant literature.
- Filtering options for users to customize desired polytime queries and transformations.
- Responsive design to ensure usability across various devices and screen sizes.
- Accessibility features to make the website usable for individuals with disabilities.

## Docs

- Data transformation model: see `docs/data-transformation-model.md` for the unified GraphData model, queue processing, validation rules, and filter pipeline.
- Graph validation & propagation: see `docs/graph-validation-and-propagation.md` for the Level-1 semantic validator and propagator specification.

## Overleaf Sync

- `npm run to-latex` now performs two steps:
	1. Regenerate LaTeX files from JSON.
	2. Mirror `docs/` to the Overleaf Git repository under `/git` and push.

- Manual push only (without regeneration):
	- `npm run push-overleaf`

- Manual pull from Overleaf `/git` into local `docs/` (not wired into other scripts):
	- `npm run pull-overleaf`
	- If local `docs/` has uncommitted changes, pull is blocked unless `OVERLEAF_PULL_FORCE=1`.

- Optional environment variables:
	- `OVERLEAF_GIT_URL` (or `OVERLEAF_REPO_URL`): override default Overleaf remote URL.
	- `OVERLEAF_BRANCH`: target branch to push to (defaults to cloned HEAD).
	- `OVERLEAF_GIT_AUTHOR_NAME`: commit author name (default `starai-sync-bot`).
	- `OVERLEAF_GIT_AUTHOR_EMAIL`: commit author email (default `starai-sync@example.com`).
	- `OVERLEAF_COMMIT_MESSAGE`: custom commit message.
	- `SKIP_OVERLEAF_PUSH=1`: skip push step (emergency/local-only generation).
	- `OVERLEAF_PULL_FORCE=1`: allow overwrite pull even with local `docs/` changes.
