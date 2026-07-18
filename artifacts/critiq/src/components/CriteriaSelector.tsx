import { useState } from 'react';
import { useLocation } from 'wouter';

type Criterion = {
  id: string;
  name: string;
  description?: string;
};

type CriteriaSelectorProps = {
  categoryId: string;
  criteria: Criterion[];
};

export default function CriteriaSelector({ categoryId, criteria }: CriteriaSelectorProps) {
  const [, navigate] = useLocation();
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);

  const toggleCriterion = (criterionId: string) => {
    setSelectedCriteria((current) =>
      current.includes(criterionId)
        ? current.filter((id) => id !== criterionId)
        : [...current, criterionId],
    );
  };

  const handleSearch = () => {
    if (selectedCriteria.length === 0) return;
    const query = selectedCriteria
      .map((criterionId) => `criteria=${encodeURIComponent(criterionId)}`)
      .join('&');
    navigate(`/explore/${encodeURIComponent(categoryId)}/results?${query}`);
  };

  const hasSelection = selectedCriteria.length > 0;

  return (
    <>
      <div className="space-y-3">
        {criteria.map((criterion) => {
          const isSelected = selectedCriteria.includes(criterion.id);
          return (
            <button
              key={criterion.id}
              type="button"
              onClick={() => toggleCriterion(criterion.id)}
              aria-pressed={isSelected}
              className={`w-full rounded-[1.5rem] border p-5 text-left transition ${
                isSelected
                  ? 'border-[#4d7c67] bg-[#f1f6f3]'
                  : 'border-[#dce5df] bg-white hover:border-[#9fbdad]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-[#1f2a25]">{criterion.name}</p>
                  {criterion.description && (
                    <p className="mt-2 text-sm leading-6 text-[#68746e]">
                      {criterion.description}
                    </p>
                  )}
                </div>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    isSelected
                      ? 'border-[#315c4c] bg-[#315c4c] text-white'
                      : 'border-[#dce5df] text-transparent'
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

      {/* 固定フッターボタン：基準選択時のみ表示 */}
      <div
        className={`fixed bottom-0 left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 border-t border-[#dce5df] bg-[#f8faf8]/95 px-5 py-4 backdrop-blur transition-all duration-300 ${
          hasSelection ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={handleSearch}
          className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]"
        >
          この基準で探す（{selectedCriteria.length}件選択中）
        </button>
      </div>
    </>
  );
}
