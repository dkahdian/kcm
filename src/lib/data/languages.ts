import type { KCLanguage } from '../types.js';
import { getReferences } from './references.js';
import languageIds from './json/languages/index.json';

// Import all language JSON files
import bddJson from './json/languages/bdd.json';
import cnfJson from './json/languages/cnf.json';
import dDnnfJson from './json/languages/d-dnnf.json';
import dNnfJson from './json/languages/d-nnf.json';
import dnfJson from './json/languages/dnf.json';
import dnnfJson from './json/languages/dnnf.json';
import fNnfJson from './json/languages/f-nnf.json';
import fbddJson from './json/languages/fbdd.json';
import ipJson from './json/languages/ip.json';
import modsJson from './json/languages/mods.json';
import nnfJson from './json/languages/nnf.json';
import obddLtJson from './json/languages/obdd-lt.json';
import obddJson from './json/languages/obdd.json';
import piJson from './json/languages/pi.json';
import sNnfJson from './json/languages/s-nnf.json';
import sdDnnfJson from './json/languages/sd-dnnf.json';

// Helper to add references to language JSON data
function enrichLanguage(langJson: any): KCLanguage {
  const refIds = new Set<string>();
  
  // Collect all reference IDs
  if (langJson.descriptionRefs) {
    langJson.descriptionRefs.forEach((id: string) => refIds.add(id));
  }
  
  if (langJson.properties?.queries) {
    Object.values(langJson.properties.queries).forEach((q: any) => {
      if (q.refs) q.refs.forEach((id: string) => refIds.add(id));
    });
  }
  
  if (langJson.properties?.transformations) {
    Object.values(langJson.properties.transformations).forEach((t: any) => {
      if (t.refs) t.refs.forEach((id: string) => refIds.add(id));
    });
  }
  
  if (langJson.tags) {
    langJson.tags.forEach((tag: any) => {
      if (tag.refs) tag.refs.forEach((id: string) => refIds.add(id));
    });
  }
  
  return {
    ...langJson,
    references: getReferences(...Array.from(refIds))
  } as KCLanguage;
}

// Create enriched language objects
export const bdd = enrichLanguage(bddJson);
export const cnf = enrichLanguage(cnfJson);
export const d_dnnf = enrichLanguage(dDnnfJson);
export const d_nnf = enrichLanguage(dNnfJson);
export const dnf = enrichLanguage(dnfJson);
export const dnnf = enrichLanguage(dnnfJson);
export const f_nnf = enrichLanguage(fNnfJson);
export const fbdd = enrichLanguage(fbddJson);
export const ip = enrichLanguage(ipJson);
export const mods = enrichLanguage(modsJson);
export const nnf = enrichLanguage(nnfJson);
export const obdd_lt = enrichLanguage(obddLtJson);
export const obdd = enrichLanguage(obddJson);
export const pi = enrichLanguage(piJson);
export const s_nnf = enrichLanguage(sNnfJson);
export const sd_dnnf = enrichLanguage(sdDnnfJson);

export const allLanguages: KCLanguage[] = [
  bdd,
  cnf,
  d_dnnf,
  d_nnf,
  dnf,
  dnnf,
  f_nnf,
  fbdd,
  ip,
  mods,
  nnf,
  obdd_lt,
  obdd,
  pi,
  s_nnf,
  sd_dnnf
];
