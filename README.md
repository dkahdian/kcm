# kcm
Knowledge Compilation map interactive website project for StarAI UCLA

This project is meant to serve as a helpful tool for researchers and engineers working with knowledge compilation. It provides an interactive, graphical interface to visualize various knowledge compilation languages.

This project is an extension of the original Knowledge Compilation Map created by Adnan Darwiche and Pierre Marquis. The original paper can be found here: [Knowledge Compilation Map](https://arxiv.org/pdf/1106.1819)

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

## Contributing

This project welcomes contributions from the community! You can add new knowledge compilation languages, update relationships, add references, and more through our web-based contribution system.

### How to Contribute

1. **Visit the contribution page**: Navigate to `/contribute` on the website
2. **Fill out the form**: Add languages, relationships, or references
3. **Submit**: Your contribution will create a pull request automatically
4. **Preview**: Each PR gets a live preview at `/previews/pr-<number>/`
5. **Track your contributions**: View your submission history in the sidebar

### For Contributors

- **API Setup**: See `docs/api-setup-guide.md` for local development and deployment configuration
- **Contribution Pipeline**: See `docs/contribution-pipeline.md` for technical details on how contributions are processed
- **History Management**: Your contributions are tracked locally in your browser and can be edited or updated at any time

### For Reviewers

- **Preview Links**: Each pull request includes a live preview link in the PR description
- **Auto-generated**: PRs are created automatically via GitHub Actions
- **Validation**: All contributions are type-checked and validated before PR creation

## Docs

- **API Setup Guide**: `docs/api-setup-guide.md` - Environment variables, deployment options, and troubleshooting
- **Contribution Pipeline**: `docs/contribution-pipeline.md` - Unified GraphData model, queue processing, validation rules, and PR generation
- **Implementation Progress**: `docs/implementation-progress.md` - Feature tracking and completion status