// Export all language modules
export { nnf } from './nnf.js';
export { dnnf } from './dnnf.js';
export { dNnf } from './d-nnf.js';
export { sNnf } from './s-nnf.js';
export { fNnf } from './f-nnf.js';
export { dDnnf } from './d-dnnf.js';
export { sdDnnf } from './sd-dnnf.js';
export { bdd } from './bdd.js';
export { fbdd } from './fbdd.js';
export { obdd } from './obdd.js';
export { obddLt } from './obdd-lt.js';
export { dnf } from './dnf.js';
export { cnf } from './cnf.js';
export { pi } from './pi.js';
export { ip } from './ip.js';
export { mods } from './mods.js';

// Convenience array of all languages
import { nnf } from './nnf.js';
import { dnnf } from './dnnf.js';
import { dNnf } from './d-nnf.js';
import { sNnf } from './s-nnf.js';
import { fNnf } from './f-nnf.js';
import { dDnnf } from './d-dnnf.js';
import { sdDnnf } from './sd-dnnf.js';
import { bdd } from './bdd.js';
import { fbdd } from './fbdd.js';
import { obdd } from './obdd.js';
import { obddLt } from './obdd-lt.js';
import { dnf } from './dnf.js';
import { cnf } from './cnf.js';
import { pi } from './pi.js';
import { ip } from './ip.js';
import { mods } from './mods.js';
import type { KCLanguage } from '../../types.js';

export const allLanguages: KCLanguage[] = [
  nnf,
  dnnf,
  dNnf,
  sNnf,
  fNnf,
  dDnnf,
  sdDnnf,
  bdd,
  fbdd,
  obdd,
  obddLt,
  dnf,
  cnf,
  pi,
  ip,
  mods
];
