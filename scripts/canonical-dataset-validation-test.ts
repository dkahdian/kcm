import assert from 'node:assert/strict';
import { canonicalDataset } from '../src/lib/data/canonical.js';
import { validateDatasetStructure } from '../src/lib/data/validation/index.js';

const result = validateDatasetStructure(canonicalDataset);
assert.ok(result.ok, result.errors?.join('; '));

console.log('Canonical dataset validation passed.');
