"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Criterion = {
  id: string;
  name: string;
  description?: string;
};

type CriteriaSelectorProps = {
  categoryId: string;
  criteria: Criterion[];
};

export default function CriteriaSelector({
  categoryId,
  criteria,
}: CriteriaSelectorProps) {
  const router = useRouter();
  const [selectedCriteria, setSelectedCriteria] =
    useState<string[]>([]);

  const toggleCriterion = (criterionId: string) => {
    setSelectedCriteria((current) =>
      current.includes(criterionId)
        ? current.filter((id) => id !== criterionId)
        : [...current, criterionId],
    );
  };

  const handleSearch = () => {
    if (selectedCriteria.length === 0) {
      return;
    }

    const query = selectedCriteria
      .map(
        (criterionId) =>
          `criteria=${encodeURIComponent(criterionId)}`,
      )
      .join("&");

    router.push(
      `/explore/${encodeURIComponent(categoryId)}/results?${query}`,
    );
  };

  return (
    <div>
      <div className="space-y-3">
        {criteria.map((criterion) => {
          const isSelected = selectedCriteria.includes(
            criterion.id,
          );

          return (
            <button
              key={criterion.id}
              type="button"
              onClick={() => toggleCriterion(criterion.id)}
              aria-pressed={isSelected}
              className={`w-full rounded-card border p-5 text-left transition ${
                isSelected
                  ? "border-brand-500 bg-brand-50"
                  : "border-border bg-card hover:border-brand-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-ink">
                    {criterion.name}
                  </p>

                  {criterion.description && (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {criterion.description}
                    </p>
                  )}
                </div>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    isSelected
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-border text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={handleSearch}
          disabled={selectedCriteria.length === 0}
          className="w-full rounded-2xl bg-brand-600 px-5 py-4 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          この基準で探す
        </button>

        <p className="mt-3 text-center text-sm text-muted">
          {selectedCriteria.length}件の基準を選択中
        </p>
      </div>
    </div>
  );
}