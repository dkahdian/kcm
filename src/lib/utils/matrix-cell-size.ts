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
	let maxWidth = 0;
	let maxHeight = 0;

	allCells.forEach((cell) => {
		const el = cell as HTMLElement;
		const oldWidth = el.style.width;
		const oldMinWidth = el.style.minWidth;
		const oldMaxWidth = el.style.maxWidth;
		el.style.width = 'auto';
		el.style.minWidth = 'auto';
		el.style.maxWidth = 'none';

		const rect = el.getBoundingClientRect();
		maxWidth = Math.max(maxWidth, rect.width);
		maxHeight = Math.max(maxHeight, rect.height);

		el.style.width = oldWidth;
		el.style.minWidth = oldMinWidth;
		el.style.maxWidth = oldMaxWidth;
	});

	const containerWidth = scrollEl.clientWidth;
	const containerHeight = scrollEl.clientHeight;

	const totalNaturalWidth = maxWidth * numCols;
	const totalNaturalHeight = maxHeight * numRows;

	const finalWidth = totalNaturalWidth <= containerWidth ? containerWidth / numCols : maxWidth;
	const finalHeight = totalNaturalHeight <= containerHeight ? containerHeight / numRows : maxHeight;

	return { width: finalWidth, height: finalHeight };
}
