/**
 * Measures table cells and computes optimal uniform cell dimensions to fit a container.
 * Used by MatrixView and OperationsMatrixView.
 *
 * @param scrollEl - The scrollable container element
 * @param tableEl - The table element
 * @param numCols - Total number of columns (including header)
 * @param numRows - Total number of rows (including header)
 * @returns Computed cell dimensions, or null if measurement isn't possible
 */
export function measureCellSize(
	scrollEl: HTMLElement,
	tableEl: HTMLTableElement,
	numCols: number,
	numRows: number
): { width: number; height: number } | null {
	if (!scrollEl || !tableEl) return null;
	if (numCols <= 0 || numRows <= 0) return null;

	const allCells = tableEl.querySelectorAll('th, td');
	const bodyCells = tableEl.querySelectorAll('tbody th, tbody td');
	// Row header cells determine minimum column width (widest language name)
	const rowHeaderCells = tableEl.querySelectorAll('tbody th');
	let maxWidth = 0;
	let maxHeight = 0;

	// Measure width only from row header cells — data cells will adapt to available width
	rowHeaderCells.forEach((cell) => {
		const el = cell as HTMLElement;
		const oldWidth = el.style.width;
		const oldMinWidth = el.style.minWidth;
		const oldMaxWidth = el.style.maxWidth;
		el.style.width = 'auto';
		el.style.minWidth = 'auto';
		el.style.maxWidth = 'none';

		const rect = el.getBoundingClientRect();
		maxWidth = Math.max(maxWidth, rect.width);

		el.style.width = oldWidth;
		el.style.minWidth = oldMinWidth;
		el.style.maxWidth = oldMaxWidth;
	});

	// Measure height only from body cells to avoid inflated header heights
	// (e.g. when column headers use vertical text)
	bodyCells.forEach((cell) => {
		const el = cell as HTMLElement;
		const oldWidth = el.style.width;
		const oldMinWidth = el.style.minWidth;
		const oldMaxWidth = el.style.maxWidth;
		el.style.width = 'auto';
		el.style.minWidth = 'auto';
		el.style.maxWidth = 'none';

		const rect = el.getBoundingClientRect();
		maxHeight = Math.max(maxHeight, rect.height);

		el.style.width = oldWidth;
		el.style.minWidth = oldMinWidth;
		el.style.maxWidth = oldMaxWidth;
	});

	const containerWidth = scrollEl.clientWidth;
	const containerHeight = scrollEl.clientHeight;

	// Header row has its own fixed height (via CSS !important), so subtract it
	const thead = tableEl.querySelector('thead');
	const headerHeight = thead?.getBoundingClientRect()?.height ?? 0;
	const numBodyRows = Math.max(numRows - 1, 1);
	const availableHeight = containerHeight - headerHeight;

	// Account for 1px borders on each cell (border-right, border-bottom, border-left on first col)
	// In table-layout:fixed with border-collapse:separate, cell width = content width;
	// borders add to the total table width/height.
	const borderWidth = 1;
	const totalBorderX = numCols * borderWidth + borderWidth; // each col has right border + first col has left border
	const totalBorderY = numBodyRows * borderWidth;

	const finalWidth = Math.max(maxWidth, Math.floor((containerWidth - totalBorderX) / numCols));
	const finalHeight = Math.max(maxHeight, Math.floor((availableHeight - totalBorderY) / numBodyRows));

	return { width: finalWidth, height: finalHeight };
}
