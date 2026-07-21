import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';
import type { ApiCategory } from '@/types/api';

export default function AdminCategories() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ slug: '', name: '', icon: '', sortOrder: '0' });
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setForm({ slug: '', name: '', icon: '', sortOrder: String(categories.length) });
    setAdding(true); setEditId(null);
  }
  function openEdit(c: ApiCategory) {
    setForm({ slug: c.slug, name: c.name, icon: c.icon, sortOrder: String(c.sortOrder) });
    setEditId(c.id); setAdding(false);
  }

  async function handleSave() {
    if (!form.slug.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      const data = { slug: form.slug.trim(), name: form.name.trim(), icon: form.icon.trim(), sortOrder: parseInt(form.sortOrder, 10) || 0 };
      if (adding) await api.admin.categories.create(data);
      else if (editId) await api.admin.categories.update(editId, data);
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setAdding(false); setEditId(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(c: ApiCategory) {
    if (!confirm(`「${c.name}」を削除しますか？関連する商品・基準もすべて削除されます。`)) return;
    await api.admin.categories.delete(c.id);
    qc.invalidateQueries({ queryKey: ['admin-categories'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
  }

  const showForm = adding || editId !== null;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1f2a25]">カテゴリ管理</h1>
        <button onClick={openAdd} className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f]">+ 追加</button>
      </div>

      {showForm && (
        <div className="mt-4 rounded-2xl border border-[#315c4c] bg-white p-5">
          <h2 className="font-bold text-[#1f2a25]">{adding ? 'カテゴリを追加' : 'カテゴリを編集'}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#68746e]">スラッグ *（URL用）</label>
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="例: tent"
                className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#68746e]">名前 *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例: テント"
                className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#68746e]">アイコン（絵文字）</label>
              <input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="例: ⛺"
                className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#68746e]">表示順</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-60">
              {saving ? '保存中…' : '保存'}
            </button>
            <button onClick={() => { setAdding(false); setEditId(null); }} className="rounded-xl border border-[#dce5df] px-4 py-2 text-sm font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">キャンセル</button>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#dce5df] bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#68746e]">読み込み中…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#dce5df] bg-[#f8faf8]">
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">アイコン</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">名前</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">スラッグ</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">順番</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, i) => (
                <tr key={c.id} className={`border-b border-[#dce5df] hover:bg-[#f8faf8] ${i === categories.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3 text-2xl">{c.icon}</td>
                  <td className="px-4 py-3 font-bold text-[#1f2a25]">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#68746e]">{c.slug}</td>
                  <td className="px-4 py-3 text-[#68746e]">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">編集</button>
                      <button onClick={() => handleDelete(c)} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100">削除</button>
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
