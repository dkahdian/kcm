import assert from 'node:assert/strict';
import { canonicalDataset } from '../src/lib/data/canonical.js';
import database from '../src/lib/data/database.json';
import { validateDatasetStructure } from '../src/lib/data/validation/index.js';

const result = validateDatasetStructure(canonicalDataset);
assert.ok(result.ok, result.errors?.join('; '));

const conditioningLemma = (database.operationLemmas ?? []).find((lemma) => lemma.id === 'and-bc-fo-cd');
assert.deepEqual(
  conditioningLemma?.antecedent,
  ['AND_BC', 'FO'],
  'conditioning requires full forgetting after bounded conjunction, not singleton forgetting'
);

console.log('Canonical dataset validation passed.');
