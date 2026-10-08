import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
// Gerado por tools/build-public.mjs a partir do espelho público do site de referência
// (inclui a lista de times, lida do arquivo futchopp-teams-*.js da referência).
export const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'catalog.json'), 'utf8'));

export const PRODUCTS = [catalog.product];
export const TEAMS = catalog.teams;

export function findProduct({ id, slug }) {
  return PRODUCTS.find((p) => (id && p.id === id) || (slug && p.slug === slug)) || null;
}

export const findTeam = (slug) => TEAMS.find((t) => t.slug === slug) || null;
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const findTeamByName = (name) => (name ? TEAMS.find((t) => norm(t.name) === norm(name)) || null : null);
