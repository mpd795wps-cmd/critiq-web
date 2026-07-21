import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';
import type { CriterionSuggestionItem } from '@/types/api';

const STATUS_LABELS: Record<string, string> = { pending: '申請中', approved: '承認済み', rejected: '却下' };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminCriterionSuggestions() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });
  const [filterStatus, setFilterStatus] = useState('pending');

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['admin-criterion-suggestions', filterStatus],
    queryFn: () => api.admin.criterionSuggestions.list(filterStatus || undefined),
  });

  const [reviewId, setReviewId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleReview(suggestion: CriterionSuggestionItem, status: 'approved' | 'rejected') {
    setProcessing(true);
    try {
      await api.admin.criterionSuggestions.review(suggestion.id, status, adminNotes || undefined);
      qc.invalidateQueries({ queryKey: ['admin-criterion-suggestions'] });
      qc.invalidateQueries({ queryKey: ['admin-criteria'] });
      qc.invalidateQueries({ queryKey: ['criteria'] });
      setReviewId(null); setAdminNotes('');
    } finally { setProcessing(false); }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1f2a25]">基準提案</h1>
      </div>
      <p className="mt-1 text-sm text-[#68746e]">ユーザーから提案された新しい比較基準を確認します。承認するとすぐに公開されます。</p>

      <div className="mt-4 flex gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c]">
          <option value="">すべて</option>
          <option value="pending">申請中</option>
          <option value="approved">承認済み</option>
          <option value="rejected">却下</option>
        </select>
        <span className="ml-auto text-sm text-[#68746e] self-center">{suggestions.length} 件</span>
      </div>

      <div className="mt-4 space-y-4">
        {isLoading ? (
          <div className="rounded-2xl border border-[#dce5df] bg-white p-8 text-center text-sm text-[#68746e]">読み込み中…</div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-2xl border border-[#dce5df] bg-white p-8 text-center text-sm text-[#68746e]">提案はありません</div>
        ) : suggestions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-[#dce5df] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#1f2a25]">{s.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#68746e]">{s.description}</p>
                {s.reason && (
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-bold">理由：</span>{s.reason}
                  </p>
                )}
                <div className="mt-2 flex gap-3 text-xs text-slate-400">
                  <span>カテゴリ: {categories.find((c) => c.id === s.categoryId)?.name ?? s.categoryId}</span>
                  <span>提案日: {new Date(s.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                {s.adminNotes && (
                  <p className="mt-2 text-xs text-[#68746e]"><span className="font-bold">管理メモ：</span>{s.adminNotes}</p>
                )}
              </div>
            </div>

            {s.status === 'pending' && (
              reviewId === s.id ? (
                <div className="mt-4 border-t border-[#dce5df] pt-4">
                  <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="管理メモ（任意）" rows={2}
                    className="w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]" />
                  <div className="mt-3 flex gap-3">
                    <button onClick={() => handleReview(s, 'approved')} disabled={processing}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                      ✓ 承認して基準に追加
                    </button>
                    <button onClick={() => handleReview(s, 'rejected')} disabled={processing}
                      className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60">
                      ✕ 却下
                    </button>
                    <button onClick={() => { setReviewId(null); setAdminNotes(''); }}
                      className="rounded-xl border border-[#dce5df] px-4 py-2 text-sm font-bold text-[#68746e] transition hover:bg-[#f1f6f3]">
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 border-t border-[#dce5df] pt-4 flex gap-3">
                  <button onClick={() => { setReviewId(s.id); setAdminNotes(''); }}
                    className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f]">
                    審査する
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
