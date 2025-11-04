export { bdd } from './bdd.js';
export { cnf } from './cnf.js';
export { dDnnf } from './d-dnnf.js';
export { dnf } from './dnf.js';
export { dnnf } from './dnnf.js';
export { dNnf } from './d-nnf.js';
export { fbdd } from './fbdd.js';
export { fNnf } from './f-nnf.js';
export { ip } from './ip.js';
export { mods } from './mods.js';
export { nnf } from './nnf.js';
export { obdd } from './obdd.js';
export { obddLt } from './obdd-lt.js';
export { pi } from './pi.js';
export { sdDnnf } from './sd-dnnf.js';
export { sNnf } from './s-nnf.js';

import { bdd } from './bdd.js';
import { cnf } from './cnf.js';
import { dDnnf } from './d-dnnf.js';
import { dnf } from './dnf.js';
import { dnnf } from './dnnf.js';
import { dNnf } from './d-nnf.js';
import { fbdd } from './fbdd.js';
import { fNnf } from './f-nnf.js';
import { ip } from './ip.js';
import { mods } from './mods.js';
import { nnf } from './nnf.js';
import { obdd } from './obdd.js';
import { obddLt } from './obdd-lt.js';
import { pi } from './pi.js';
import { sdDnnf } from './sd-dnnf.js';
import { sNnf } from './s-nnf.js';

import type { KCLanguage } from '../../types.js';

export const allLanguages: KCLanguage[] = [
  bdd,
  cnf,
  dDnnf,
  dnf,
  dnnf,
  dNnf,
  fbdd,
  fNnf,
  ip,
  mods,
  nnf,
  obdd,
  obddLt,
  pi,
  sdDnnf,
  sNnf
];
