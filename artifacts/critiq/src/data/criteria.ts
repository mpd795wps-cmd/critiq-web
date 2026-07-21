export type CriterionDefinition = {
  id: string;
  name: string;
  description?: string;
  categoryId?: string; // only on live (user-added) criteria
};

export const criteriaDefinitions: CriterionDefinition[] = [
  {
    id: 'easy-setup',
    name: '設営しやすさ',
    description: '組み立てや撤収が簡単か',
  },
  {
    id: 'lightweight',
    name: '軽さ',
    description: '持ち運びやすい重量か',
  },
  {
    id: 'wind-resistant',
    name: '耐風性',
    description: '強い風にも耐えやすいか',
  },
  {
    id: 'waterproof',
    name: '防水性',
    description: '雨の侵入を防ぎやすいか',
  },
  {
    id: 'spacious',
    name: '居住性',
    description: '室内を広く快適に使えるか',
  },
];

export const criteriaByCategory: Record<string, CriterionDefinition[]> = {
  tent: criteriaDefinitions,
  tents: criteriaDefinitions,
};

export const criteriaLabels: Record<string, string> = Object.fromEntries(
  criteriaDefinitions.map(({ id, name }) => [id, name]),
);

export function getCriterionLabel(criterionId: string): string {
  return criteriaLabels[criterionId] ?? criterionId;
}

// ── Live (user-added) criteria ────────────────────────────────
export const LIVE_CRITERIA_KEY = 'critiq_live_criteria';

export type LiveCriterion = CriterionDefinition & { categoryId: string };

export function getLiveCriteria(): LiveCriterion[] {
  try {
    return JSON.parse(localStorage.getItem(LIVE_CRITERIA_KEY) ?? '[]') as LiveCriterion[];
  } catch {
    return [];
  }
}

export function addLiveCriterion(c: LiveCriterion): void {
  const existing = getLiveCriteria();
  existing.push(c);
  localStorage.setItem(LIVE_CRITERIA_KEY, JSON.stringify(existing));
}

/** All criteria (builtin + live) for a given category */
export function getAllCriteriaForCategory(categoryId: string): CriterionDefinition[] {
  const builtin = criteriaByCategory[categoryId] ?? [];
  const live = getLiveCriteria().filter((c) => c.categoryId === categoryId);
  return [...builtin, ...live];
}

/** Simple similarity: ratio of shared characters between two strings (0–1) */
export function criterionSimilarity(a: string, b: string): number {
  const sa = new Set(a.replace(/\s/g, '').split(''));
  const sb = new Set(b.replace(/\s/g, '').split(''));
  const intersection = [...sa].filter((ch) => sb.has(ch)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Return existing criteria that are similar to a query name (threshold 0.35) */
export function findSimilarCriteria(
  categoryId: string,
  name: string,
  threshold = 0.35,
): CriterionDefinition[] {
  const all = getAllCriteriaForCategory(categoryId);
  return all.filter((c) => {
    const sim = criterionSimilarity(c.name, name);
    const aContainsB = c.name.includes(name) || name.includes(c.name);
    return sim >= threshold || aContainsB;
  });
}
