import type {
  CanonicalKCData,
  KCAdjacencyMatrix,
  KCLanguage,
  DirectedSuccinctnessRelation,
  TransformValidationResult
} from '../types.js';
import { validateDatasetStructure } from './validation.js';
import { propagateImplicitRelations } from './propagation.js';

export interface TransformOptions {
  /** run the validity checker after the transform */
  checkValidity?: boolean;
  /** run the implicit propagation pass after validity succeeds */
  propagateImplicit?: boolean;
}

export type DataTransform = (data: CanonicalKCData) => CanonicalKCData;

export interface TransformRuntimeHooks {
  validate?: (data: CanonicalKCData) => TransformValidationResult;
  propagate?: (data: CanonicalKCData) => CanonicalKCData;
  onInvalid?: (result: TransformValidationResult) => void;
}

export interface TransformStage {
  lambda: DataTransform;
  options?: TransformOptions;
  name?: string;
}

const defaultValidate = validateDatasetStructure;

const defaultPropagate = propagateImplicitRelations;

function defaultOnInvalid(result: TransformValidationResult): void {
  if (result.errors?.length) {
    console.warn('transformData validity check failed:', result.errors);
  }
}

export function cloneDataset(data: CanonicalKCData): CanonicalKCData {
  // structuredClone fails in browsers for datasets containing functions/complex types.
  // JSON parse/stringify is sufficient for our canonical data shape and avoids runtime errors.
  return JSON.parse(JSON.stringify(data));
}

function rebuildAdjacencyMatrix(
  sourceMatrix: KCAdjacencyMatrix,
  allowedLanguageIds: string[]
): KCAdjacencyMatrix {
  const newIndexByLanguage: Record<string, number> = {};
  const newMatrix: (DirectedSuccinctnessRelation | null)[][] = allowedLanguageIds.map((sourceId, sourceIdx) => {
    newIndexByLanguage[sourceId] = sourceIdx;
    const originalSourceIdx = sourceMatrix.indexByLanguage[sourceId];
    const sourceRow = originalSourceIdx !== undefined ? sourceMatrix.matrix[originalSourceIdx] : undefined;

    return allowedLanguageIds.map((targetId) => {
      if (!sourceRow) return null;
      const originalTargetIdx = sourceMatrix.indexByLanguage[targetId];
      if (originalTargetIdx === undefined) return null;
      return sourceRow[originalTargetIdx] ?? null;
    });
  });

  return {
    languageIds: allowedLanguageIds,
    indexByLanguage: newIndexByLanguage,
    matrix: newMatrix
  };
}

type LanguageMapper = (language: KCLanguage) => KCLanguage | null;

export function mapLanguagesInDataset(
  data: CanonicalKCData,
  mapper: LanguageMapper
): CanonicalKCData {
  const cloned = cloneDataset(data);
  const updatedLanguages: KCLanguage[] = [];
  let anyRemoved = false;

  for (const language of cloned.languages) {
    const nextLanguage = mapper(language);
    if (nextLanguage) {
      updatedLanguages.push(nextLanguage);
    } else {
      anyRemoved = true;
    }
  }

  cloned.languages = updatedLanguages;
  if (anyRemoved) {
    const nextLanguageIds = updatedLanguages.map((lang) => lang.id);
    cloned.adjacencyMatrix = rebuildAdjacencyMatrix(cloned.adjacencyMatrix, nextLanguageIds);
  }
  return cloned;
}

type RelationMapper = (
  relation: DirectedSuccinctnessRelation | null,
  sourceId: string,
  targetId: string
) => DirectedSuccinctnessRelation | null;

export function mapRelationsInDataset(
  data: CanonicalKCData,
  mapper: RelationMapper
): CanonicalKCData {
  const cloned = cloneDataset(data);
  const { languageIds, matrix } = cloned.adjacencyMatrix;

  for (let i = 0; i < languageIds.length; i += 1) {
    const sourceId = languageIds[i];
    for (let j = 0; j < languageIds.length; j += 1) {
      const targetId = languageIds[j];
      matrix[i][j] = mapper(matrix[i][j], sourceId, targetId);
    }
  }

  return cloned;
}

export function transformData(
  input: CanonicalKCData,
  lambda: DataTransform,
  options: TransformOptions = {},
  hooks: TransformRuntimeHooks = {}
): CanonicalKCData | null {
  const cloned = cloneDataset(input);
  const mutated = lambda(cloned);

  if (options.checkValidity) {
    const validate = hooks.validate ?? defaultValidate;
    const result = validate(mutated);
    if (!result.ok) {
      (hooks.onInvalid ?? defaultOnInvalid)(result);
      return null;
    }
  }

  if (options.propagateImplicit) {
    const propagate = hooks.propagate ?? defaultPropagate;
    return propagate(mutated);
  }

  return mutated;
}

export function runTransformPipeline(
  input: CanonicalKCData,
  stages: TransformStage[],
  hooks: TransformRuntimeHooks = {}
): CanonicalKCData | null {
  return stages.reduce<CanonicalKCData | null>((acc, stage, index) => {
    if (!acc) return null;
    const result = transformData(acc, stage.lambda, stage.options, hooks);
    if (!result) {
      console.warn(`Transform pipeline halted at stage ${stage.name ?? index}`);
    }
    return result;
  }, input);
}
