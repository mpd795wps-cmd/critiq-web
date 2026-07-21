import { useState } from 'react';
import { useLocation } from 'wouter';
import type { ApiCriterion } from '@/types/api';

type CriteriaSelectorProps = {
  categorySlug: string;
  criteria: ApiCriterion[];
};

export default function CriteriaSelector({ categorySlug, criteria }: CriteriaSelectorProps) {
  const [, navigate] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggle = (id: number) => {
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  const handleSearch = () => {
    if (selectedIds.length === 0) return;
    const query = selectedIds.map((id) => `criteria=${id}`).join('&');
    navigate(`/explore/${encodeURIComponent(categorySlug)}/results?${query}`);
  };

  const hasSelection = selectedIds.length > 0;

  return (
    <>
      <div className="space-y-3">
        {criteria.map((criterion) => {
          const isSelected = selectedIds.includes(criterion.id);
          return (
            <button
              key={criterion.id}
              type="button"
              onClick={() => toggle(criterion.id)}
              aria-pressed={isSelected}
              className={`w-full rounded-[1.5rem] border p-5 text-left transition ${
                isSelected
                  ? 'border-[#4d7c67] bg-[#f1f6f3]'
                  : 'border-[#dce5df] bg-white hover:border-[#9fbdad]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-bold text-[#1f2a25]">{criterion.name}</p>
                    {criterion.isOfficial
                      ? <span className="rounded-full bg-[#e8f0eb] px-2 py-0.5 text-[10px] font-bold text-[#315c4c]">公式</span>
                      : criterion.createdByUsername
                        ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">by {criterion.createdByUsername}</span>
                        : null
                    }
                  </div>
                  {criterion.description && (
                    <p className="mt-2 text-sm leading-6 text-[#68746e]">{criterion.description}</p>
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
          この基準で探す（{selectedIds.length}件選択中）
        </button>
      </div>
    </>
  );
}
