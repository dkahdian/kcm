/**
 * Canonical language ordering for matrix views.
 *
 * Computed once from the current dataset to keep polynomial edges
 * upper-triangular in the succinctness matrix.
 *
 * Languages not in this map are appended alphabetically.
 */

export const CANONICAL_ORDER: Record<string, number> = {
	'lang_5bf00851': 0, // NNF
	'lang_3bebcab7': 1, // DNNF
	'lang_1df07cc3': 2, // nFBDD
	'lang_b13b0d78': 3, // SDNNF
	'lang_6c130090': 4, // d-DNNF
	'lang_d24efe0e': 5, // nOBDD
	'lang_4e62a038': 6, // uFBDD
	'lang_ea9b5299': 7, // d-SDNNF
	'lang_981b62f0': 8, // dec-DNNF
	'lang_684b1ca7': 9, // FBDD
	'lang_c2df8c2b': 10, // uOBDD
	'lang_1afefbe2': 11, // SDD
	'lang_83e3b023': 12, // cSDD
	'lang_0f27d539': 13, // dec-SDNNF
	'lang_b9d72a7c': 14, // OBDD
	'lang_89649e36': 15, // CNF
	'lang_27fffab2': 16, // PI
	'lang_3c803ba1': 17, // SDNNF_T
	'lang_91f812d0': 18, // d-SDNNF_T
	'lang_9c84a267': 19, // SDD_T
	'lang_82fa749e': 20, // cSDD_T
	'lang_4ae03bc8': 21, // dec-SDNNF_T
	'lang_d69995dd': 22, // OBDD_<
	'lang_e827cf31': 23, // nOBDD_<
	'lang_4c204bf3': 24, // DNF
	'lang_6ae90adc': 25, // IP
	'lang_e02902d0': 26, // MODS
	'lang_43a33aec': 27 // uOBDD_<
};

/**
 * Compare two language IDs by canonical order, with alphabetical fallback.
 * @param getName - function to get a language's display name from its ID
 */
export function compareByCanonicalOrder(
	a: string,
	b: string,
	getName: (id: string) => string
): number {
	const pa = CANONICAL_ORDER[a] ?? 1000;
	const pb = CANONICAL_ORDER[b] ?? 1000;
	if (pa !== pb) return pa - pb;
	return getName(a).localeCompare(getName(b));
}
