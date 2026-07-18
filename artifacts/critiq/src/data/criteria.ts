export type CriterionDefinition = {
  id: string;
  name: string;
  description?: string;
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
