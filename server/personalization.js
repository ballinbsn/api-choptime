import { findTeam, findTeamByName } from './catalog.js';

const clean = (v, max = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
// O campo do site aceita até 20 caracteres e já força maiúsculas.
const NAME_MAX = 20;

// Normaliza uma unidade personalizada (objeto estruturado enviado pelo navegador).
// A lista de times vem do catálogo do servidor (copiada da referência): o time e a série são conferidos aqui.
function normalizeUnit(u) {
  if (!u || typeof u !== 'object') return null;
  const team = findTeam(clean(u.team, 60)) || findTeamByName(clean(u.teamName ?? u.team_name, 60));
  const serie = u.serie === 'A' || u.serie === 'B' ? u.serie : null;
  return {
    serie: team ? team.serie : serie,
    serie_sent: serie,
    team: team ? team.slug : clean(u.team, 60) || null,
    team_name: team ? team.name : clean(u.teamName ?? u.team_name, 60) || null,
    team_known: !!team,
    custom_name: clean(u.name ?? u.custom_name, NAME_MAX).toUpperCase(),
  };
}

// "Unidade N: Flamengo (Série A) • Nome: JOÃO" → campos.
// Usado só como reserva quando o navegador não enviou o objeto estruturado.
export function parseUnitText(text) {
  const m = /^(?:Un(?:idade|\.)\s*\d+:\s*)?(.+?)\s*\(S[ée]rie\s*([AB])\)\s*•\s*Nome:\s*(.+)$/i.exec(String(text || '').trim());
  if (!m) return null;
  const team = findTeamByName(clean(m[1], 60));
  return {
    serie: team ? team.serie : m[2].toUpperCase(),
    serie_sent: m[2].toUpperCase(),
    team: team ? team.slug : null,
    team_name: team ? team.name : clean(m[1], 60),
    team_known: !!team,
    custom_name: clean(m[3], NAME_MAX).toUpperCase(),
    parsed_from_text: true,
  };
}

// Completa = time existe na lista, série confere com o time e o nome foi preenchido.
export function unitIsComplete(u) {
  if (!u) return false;
  return !!(u.team_known && u.serie && (!u.serie_sent || u.serie_sent === u.serie) && u.custom_name);
}

// Monta a lista final de unidades do pedido, na ordem, com numeração contínua.
// `lines` vem de priceOrder; `items` é o payload do navegador.
export function buildUnits(items, lines) {
  const units = [];
  const warnings = [];
  items.forEach((item, idx) => {
    const line = lines[idx];
    const expected = line.units;
    let structured = Array.isArray(item.personalization) ? item.personalization.map(normalizeUnit).filter(Boolean) : [];
    if (structured.length === 0) {
      const texts = Array.isArray(item.units) && item.units.length ? item.units : item.variant ? String(item.variant).split(' | ') : [];
      structured = texts.map(parseUnitText).filter(Boolean);
      if (structured.length) warnings.push(`item ${idx + 1}: personalização reconstruída a partir do texto`);
    }
    if (structured.length !== expected) warnings.push(`item ${idx + 1}: esperadas ${expected} unidade(s) personalizada(s), recebidas ${structured.length}`);
    for (let i = 0; i < Math.max(expected, structured.length); i++) {
      const u = structured[i] || null;
      units.push({
        n: units.length + 1,
        product_id: line.product.id,
        product_slug: line.product.slug,
        product_name: line.product.name,
        ...(u || { serie: null, team: null, team_name: null, custom_name: '' }),
        complete: unitIsComplete(u),
      });
    }
  });
  const complete = units.length > 0 && units.every((u) => u.complete) && warnings.length === 0;
  return { units, warnings, complete };
}

export function describeUnit(u) {
  return `Unidade ${u.n}: ${u.team_name || '?'} (Série ${u.serie || '?'}) • Nome: ${u.custom_name}`;
}
