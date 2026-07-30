<script lang="ts">
  let {
    scope,
    onExport
  }: {
    scope: string;
    onExport: () => void;
  } = $props();
</script>

<button
  type="button"
  class="latex-export"
  onclick={onExport}
  title={`Download LaTeX for ${scope}`}
  aria-label={`Export ${scope} as LaTeX`}
>
  <svg class="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
  </svg>
  Export
</button>

<style>
  .latex-export {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0;
    padding: 0.35rem 0.6rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.35rem;
    background: #f8fafc;
    color: #475569;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .latex-export:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
    color: #1e40af;
  }

  .latex-export:focus-visible {
    outline: 2px solid #93c5fd;
    outline-offset: 2px;
  }

  .export-icon {
    width: 0.9rem;
    height: 0.9rem;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
