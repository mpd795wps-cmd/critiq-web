import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';
import type { CategorySuggestionItem } from '@/types/api';

const STATUS_LABELS: Record<string, string> = { pending: '審査待ち', approved: '承認済み', rejected: '見送り' };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};

export default function AdminCategorySuggestions() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['admin-category-suggestions', filterStatus],
    queryFn: () => api.admin.categorySuggestions.list(filterStatus || undefined),
  });

  async function handleReview(item: CategorySuggestionItem, status: 'approved' | 'rejected') {
    setSaving(true);
    try {
      await api.admin.categorySuggestions.review(item.id, { status, adminNotes: adminNotes.trim() || undefined });
      qc.invalidateQueries({ queryKey: ['admin-category-suggestions'] });
      setReviewing(null);
      setAdminNotes('');
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-[#1f2a25]">カテゴリ提案</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        {['pending', 'approved', 'rejected', ''].map((s) => (
          <button key={s || 'all'} onClick={() => setFilterStatus(s)}
            className={`rounded-xl border px-3 py-1.5 text-sm font-bold transition ${
              filterStatus === s
                ? 'border-[#315c4c] bg-[#315c4c] text-white'
                : 'border-[#dce5df] bg-white text-[#315c4c] hover:bg-[#f1f6f3]'
            }`}>
            {s ? STATUS_LABELS[s] : 'すべて'}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-[#68746e]">{suggestions.length} 件</span>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="py-8 text-center text-sm text-[#68746e]">読み込み中…</p>}
        {!isLoading && suggestions.length === 0 && (
          <p className="py-8 text-center text-sm text-[#68746e]">該当する提案はありません</p>
        )}

        {suggestions.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[#dce5df] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#1f2a25]">{item.name}</p>
                {item.description && <p className="mt-1 text-sm text-[#68746e]">{item.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#68746e]">
                  {item.submitterEmail && <span>📧 {item.submitterEmail}</span>}
                  <span>{new Date(item.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                {item.adminNotes && (
                  <p className="mt-1 text-xs text-[#68746e]">管理メモ: {item.adminNotes}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
            </div>

            {item.status === 'pending' && (
              reviewing === item.id ? (
                <div className="mt-4 border-t border-[#dce5df] pt-4">
                  <label className="block text-xs font-bold text-[#68746e]">管理メモ（任意・メールで通知されます）</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]"
                  />
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleReview(item, 'approved')} disabled={saving}
                      className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                      承認
                    </button>
                    <button onClick={() => handleReview(item, 'rejected')} disabled={saving}
                      className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50">
                      見送り
                    </button>
                    <button onClick={() => { setReviewing(null); setAdminNotes(''); }}
                      className="rounded-xl border border-[#dce5df] px-4 py-2 text-sm font-bold text-[#68746e] transition hover:bg-[#f1f6f3]">
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setReviewing(item.id); setAdminNotes(''); }}
                  className="mt-3 rounded-xl border border-[#315c4c] px-4 py-2 text-sm font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">
                  審査する
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
