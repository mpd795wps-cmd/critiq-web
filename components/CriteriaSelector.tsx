"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Criterion } from "../data/criteria";

type CriteriaSelectorProps = {
  categoryId: string;
  criteria: Criterion[];
};

export default function CriteriaSelector({
  categoryId,
  criteria,
}: CriteriaSelectorProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleCriterion(criterionId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(criterionId)
        ? currentIds.filter((id) => id !== criterionId)
        : [...currentIds, criterionId],
    );
  }

  function handleSearch() {
    if (selectedIds.length === 0) {
      return;
    }

    const searchParams = new URLSearchParams({
      criteria: selectedIds.join(","),
    });

    router.push(`/explore/${categoryId}/results?${searchParams.toString()}`);
  }

  return (
    <>
      <div className="space-y-3">
        {criteria.map((criterion) => {
          const isSelected = selectedIds.includes(criterion.id);

          return (
            <button
              key={criterion.id}
              type="button"
              onClick={() => toggleCriterion(criterion.id)}
              aria-pressed={isSelected}
              className={`flex w-full items-start gap-4 rounded-card border p-4 text-left shadow-soft transition ${
                isSelected
                  ? "border-brand-600 bg-brand-50"
                  : "border-border bg-card hover:border-brand-300"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                  isSelected
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-border bg-white"
                }`}
              >
                {isSelected && (
                  <Check aria-hidden="true" size={16} strokeWidth={3} />
                )}
              </span>

              <span className="min-w-0">
                <span className="block font-bold text-ink">
                  {criterion.name}
                </span>

                <span className="mt-1 block text-sm leading-6 text-muted">
                  {criterion.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl bg-brand-50 px-4 py-3 text-center text-sm text-brand-700">
        {selectedIds.length === 0
          ? "重視する基準を選択してください"
          : `${selectedIds.length}件の基準を選択中`}
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={selectedIds.length === 0}
        className="mt-4 flex w-full items-center justify-center rounded-button bg-brand-600 px-4 py-4 font-bold text-white shadow-soft transition enabled:hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-200"
      >
        この基準で探す
      </button>
    </>
  );
}