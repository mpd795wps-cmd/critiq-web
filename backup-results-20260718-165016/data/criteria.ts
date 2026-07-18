export type CriterionDefinition = {
  id: string;
  name: string;
};

export const criteriaDefinitions: CriterionDefinition[] = [
  {
    id: "easy-setup",
    name: "設営しやすさ",
  },
  {
    id: "lightweight",
    name: "軽さ",
  },
  {
    id: "wind-resistant",
    name: "耐風性",
  },
  {
    id: "waterproof",
    name: "防水性",
  },
  {
    id: "spacious",
    name: "居住性",
  },
];

export const criteriaLabels: Record<string, string> =
  Object.fromEntries(
    criteriaDefinitions.map((criterion) => [
      criterion.id,
      criterion.name,
    ]),
  );

export function getCriterionLabel(criterionId: string): string {
  return criteriaLabels[criterionId] ?? criterionId;
}