import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';
import type { ApiCriterion } from '@/types/api';

export default function AdminCriteria() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });
  const [filterCategoryId, setFilterCategoryId] = useState('');

  const { data: criteria = [], isLoading } = useQuery({
    queryKey: ['admin-criteria', filterCategoryId],
    queryFn: () => api.admin.criteria.list(filterCategoryId ? parseInt(filterCategoryId, 10) : undefined),
  });

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ categoryId: '', name: '', description: '', status: 'active', sortOrder: '0' });

  function openAdd() {
    setForm({ categoryId: filterCategoryId || (categories[0]?.id.toString() ?? ''), name: '', description: '', status: 'active', sortOrder: String(criteria.length) });
    setAdding(true);
    setEditId(null);
  }

  function openEdit(c: ApiCriterion) {
    setForm({ categoryId: String(c.categoryId), name: c.name, description: c.description ?? '', status: c.status, sortOrder: String(c.sortOrder) });
    setEditId(c.id);
    setAdding(false);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.categoryId) return;
    const data = { categoryId: parseInt(form.categoryId, 10), name: form.name.trim(), description: form.description.trim() || undefined, status: form.status, sortOrder: parseInt(form.sortOrder, 10) || 0 };
    if (adding) await api.admin.criteria.create(data);
    else if (editId) await api.admin.criteria.update(editId, data);
    qc.invalidateQueries({ queryKey: ['admin-criteria'] });
    qc.invalidateQueries({ queryKey: ['criteria'] });
    setAdding(false); setEditId(null);
  }

  async function handleToggleStatus(c: ApiCriterion) {
    await api.admin.criteria.update(c.id, { categoryId: c.categoryId, name: c.name, description: c.description ?? undefined, sortOrder: c.sortOrder, status: c.status === 'active' ? 'archived' : 'active' });
    qc.invalidateQueries({ queryKey: ['admin-criteria'] });
    qc.invalidateQueries({ queryKey: ['criteria'] });
  }

  async function handleDelete(c: ApiCriterion) {
    if (!confirm(`「${c.name}」を削除しますか？`)) return;
    await api.admin.criteria.delete(c.id);
    qc.invalidateQueries({ queryKey: ['admin-criteria'] });
    qc.invalidateQueries({ queryKey: ['criteria'] });
  }

  const showForm = adding || editId !== null;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1f2a25]">基準管理</h1>
        <button onClick={openAdd} className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f]">+ 追加</button>
      </div>

      <div className="mt-4 flex gap-3">
        <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}
          className="rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c]">
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <span className="ml-auto text-sm text-[#68746e] self-center">{criteria.length} 件</span>
      </div>

      {showForm && (
        <div className="mt-4 rounded-2xl border border-[#315c4c] bg-white p-5">
          <h2 className="font-bold text-[#1f2a25]">{adding ? '新しい基準を追加' : '基準を編集'}</h2>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#68746e]">カテゴリ *</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]">
                  <option value="">選択</option>
                  {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#68746e]">ステータス</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]">
                  <option value="active">公開中</option>
                  <option value="archived">非公開</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#68746e]">基準名 *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例: 設営しやすさ"
                className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#68746e]">説明</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="例: 組み立てや撤収が簡単か"
                className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f]">保存</button>
            <button onClick={() => { setAdding(false); setEditId(null); }} className="rounded-xl border border-[#dce5df] px-4 py-2 text-sm font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">キャンセル</button>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#dce5df] bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#68746e]">読み込み中…</div>
        ) : criteria.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#68746e]">基準がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#dce5df] bg-[#f8faf8]">
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">基準名</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">カテゴリ</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">ステータス</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">操作</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, i) => (
                <tr key={c.id} className={`border-b border-[#dce5df] hover:bg-[#f8faf8] ${i === criteria.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#1f2a25]">{c.name}</p>
                    {c.description && <p className="text-xs text-[#68746e]">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-[#68746e]">{categories.find((cat) => cat.id === c.categoryId)?.name ?? c.categoryId}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status === 'active' ? '公開中' : '非公開'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100">編集</button>
                      <button onClick={() => handleToggleStatus(c)} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100">
                        {c.status === 'active' ? '非公開' : '公開'}
                      </button>
                      <button onClick={() => handleDelete(c)} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100">削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
