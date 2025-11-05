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

## Docs

- Contribution pipeline specification: see `docs/contribution-pipeline.md` for the unified GraphData model, queue processing, validation rules, preview semantics, and PR generation.