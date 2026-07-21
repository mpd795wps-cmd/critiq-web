import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import AdminLayout from './AdminLayout';
import type { CriterionSuggestionItem } from '@/types/api';

type StatusFilter = 'pending' | 'approved' | 'rejected';

const inputClass = 'w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c] transition';

export default function AdminCriterionSuggestions() {
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['admin', 'criterion-suggestions', filter],
    queryFn: () => api.admin.criterionSuggestions.list(filter),
  });

  function openReview(s: CriterionSuggestionItem) {
    setReviewId(s.id);
    setAdminNotes('');
    setEditName(s.name);
    setEditDesc(s.description);
  }

  function closeReview() {
    setReviewId(null);
    setAdminNotes('');
    setEditName('');
    setEditDesc('');
  }

  async function handleReview(s: CriterionSuggestionItem, status: 'approved' | 'rejected') {
    setProcessing(true);
    try {
      await api.admin.criterionSuggestions.review(s.id, {
        status,
        adminNotes: adminNotes || undefined,
        name: editName.trim() || undefined,
        description: editDesc.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'criterion-suggestions'] });
      closeReview();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setProcessing(false);
    }
  }

  const statusLabel: Record<StatusFilter, string> = {
    pending: '審査待ち',
    approved: '承認済み',
    rejected: '却下',
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-black text-[#1f2a25]">基準申請</h1>

      <div className="mt-4 flex gap-2">
        {(['pending', 'approved', 'rejected'] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${filter === s ? 'bg-[#315c4c] text-white' : 'border border-[#dce5df] text-[#315c4c] hover:bg-[#f1f6f3]'}`}>
            {statusLabel[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-8 animate-pulse text-[#68746e]">読み込み中…</div>
      ) : suggestions.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#dce5df] bg-white p-6 text-center text-sm text-[#68746e]">
          {statusLabel[filter]}の申請はありません
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-2xl border border-[#dce5df] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#1f2a25]">{s.name}</p>
                  <p className="mt-0.5 text-xs text-[#68746e]">{s.description}</p>
                  {s.submitterUsername && (
                    <p className="mt-1 text-xs text-slate-400">提案者: {s.submitterUsername}</p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">カテゴリID: {s.categoryId}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{new Date(s.createdAt).toLocaleDateString('ja-JP')}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                  s.status === 'pending' ? 'bg-amber-100 text-amber-700'
                  : s.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-600'
                }`}>{statusLabel[s.status as StatusFilter]}</span>
              </div>

              {s.reason && (
                <p className="mt-2 rounded-lg bg-[#f8faf8] px-3 py-2 text-xs text-[#68746e]">
                  <span className="font-bold">提案理由：</span>{s.reason}
                </p>
              )}
              {s.adminNotes && (
                <p className="mt-2 text-xs text-[#68746e]">
                  <span className="font-bold">管理メモ：</span>{s.adminNotes}
                </p>
              )}

              {s.status === 'pending' && (
                reviewId === s.id ? (
                  <div className="mt-4 border-t border-[#dce5df] pt-4 space-y-3">
                    <p className="text-xs font-bold text-[#315c4c]">承認前に内容を編集できます</p>
                    <div>
                      <label className="block text-[11px] font-bold text-[#68746e] mb-1">基準名</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#68746e] mb-1">説明</label>
                      <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                        rows={2} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#68746e] mb-1">管理メモ（任意）</label>
                      <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                        rows={2} className={inputClass} />
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <button onClick={() => handleReview(s, 'approved')} disabled={processing}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                        ✓ 承認して基準に追加
                      </button>
                      <button onClick={() => handleReview(s, 'rejected')} disabled={processing}
                        className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60">
                        ✕ 却下
                      </button>
                      <button onClick={closeReview}
                        className="rounded-xl border border-[#dce5df] px-4 py-2 text-sm font-bold text-[#68746e] transition hover:bg-[#f1f6f3]">
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 border-t border-[#dce5df] pt-4">
                    <button onClick={() => openReview(s)}
                      className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f]">
                      審査する
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
