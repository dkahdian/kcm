# tractable-circuit-zoo
Boolean functions are one of the most basic objects in computer science, with countless applications demanding their efficient representation, manipulation, and querying. However, the succinctness of a representation is usually in tension with its tractability for manipulation and querying. The tractable circuit zoo catalogs known representation languages together with their relations in terms of succinctness and tractability. While research in the area spans many decades, lots of progress has been made just recently, and much work remains. We hope the zoo may serve as an open source survey of the area that grows as our understanding does.

Visit the zoo at https://circuitzoo.net/

## Contribution pipeline

Sandbox submissions dispatch the `Process Data Contribution` GitHub Actions
workflow. The deployed site reads the intentionally public dispatcher PAT from
the `PUBLIC_CONTRIBUTION_PAT` repository Actions variable. The PAT must be a
fine-grained token scoped only to `circuitzoo/tcz` with `Contents: read and
write`; it does not need pull-request access.

The contribution workflow uses its built-in `GITHUB_TOKEN` to push the generated
branch and open the pull request. In repository **Settings → Actions → General**,
set workflow permissions to **Read and write permissions** and enable **Allow
GitHub Actions to create and approve pull requests**. No `CONTRIBUTION_TOKEN`
Actions secret is required.
