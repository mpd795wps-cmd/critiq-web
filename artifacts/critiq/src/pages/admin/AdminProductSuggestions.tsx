import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';
import type { ProductSuggestionItem } from '@/types/api';

const STATUS_LABELS: Record<string, string> = { pending: '申請中', approved: '承認済み', rejected: '却下' };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminProductSuggestions() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });
  const [filterStatus, setFilterStatus] = useState('pending');

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['admin-product-suggestions', filterStatus],
    queryFn: () => api.admin.productSuggestions.list(filterStatus || undefined),
  });

  const [reviewId, setReviewId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleReview(suggestion: ProductSuggestionItem, status: 'approved' | 'rejected') {
    setProcessing(true);
    try {
      await api.admin.productSuggestions.review(suggestion.id, status, adminNotes || undefined);
      qc.invalidateQueries({ queryKey: ['admin-product-suggestions'] });
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setReviewId(null); setAdminNotes('');
    } finally { setProcessing(false); }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1f2a25]">商品登録申請</h1>
      </div>
      <p className="mt-1 text-sm text-[#68746e]">ユーザーから申請された商品の登録を確認します。承認すると公開商品として追加されます。</p>

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
          <div className="rounded-2xl border border-[#dce5df] bg-white p-8 text-center text-sm text-[#68746e]">申請はありません</div>
        ) : suggestions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-[#dce5df] bg-white p-5">
            <div className="flex gap-4">
              {s.images[0] && (
                <img src={s.images[0]} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#1f2a25]">{s.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
                <p className="text-sm text-[#68746e]">{s.brand}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>カテゴリ: {categories.find((c) => c.id === s.categoryId)?.name ?? s.categoryId}</span>
                  {s.modelNumber && <span>型番: {s.modelNumber}</span>}
                  {s.janCode && <span>JAN: {s.janCode}</span>}
                  {s.price && <span>価格: ¥{s.price.toLocaleString()}</span>}
                  <span>申請日: {new Date(s.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                {s.description && <p className="mt-2 text-xs text-[#68746e]">{s.description}</p>}
                {s.adminNotes && <p className="mt-2 text-xs text-[#68746e]"><span className="font-bold">管理メモ：</span>{s.adminNotes}</p>}
              </div>
            </div>

            {s.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {s.images.map((img, i) => (
                  <img key={i} src={img} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover border border-[#dce5df]" />
                ))}
              </div>
            )}

            {s.status === 'pending' && (
              reviewId === s.id ? (
                <div className="mt-4 border-t border-[#dce5df] pt-4">
                  <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="管理メモ（任意）" rows={2}
                    className="w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]" />
                  <div className="mt-3 flex gap-3">
                    <button onClick={() => handleReview(s, 'approved')} disabled={processing}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                      ✓ 承認して商品に追加
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
                <div className="mt-4 border-t border-[#dce5df] pt-4">
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
