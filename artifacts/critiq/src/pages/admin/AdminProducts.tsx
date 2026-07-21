import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';
import type { AdminProductItem } from '@/types/api';

// ─── Constants ────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = { active: '公開中', pending: '保留中', rejected: '却下' };
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
};

type FormState = {
  categoryId: string;
  brand: string;
  name: string;
  modelNumber: string;
  janCode: string;
  price: string;
  description: string;
  status: string;
  imageUrls: string; // newline-separated
};

const EMPTY_FORM: FormState = {
  categoryId: '', brand: '', name: '', modelNumber: '',
  janCode: '', price: '', description: '', status: 'active', imageUrls: '',
};

// ─── JAN lookup result type ────────────────────────────────
type JanResult =
  | { found: true; name: string; brand: string; description: string; images: string[]; lowestPrice: number | null }
  | { found: false; reason?: string };

// ─── Sub-component: ProductForm panel ─────────────────────
function ProductForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  title,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });

  const [janLoading, setJanLoading] = useState(false);
  const [janMsg, setJanMsg] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlMsg, setUrlMsg] = useState('');

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'janCode') triggerJanLookup(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerJanLookup(code: string) {
    setJanMsg('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!/^\d{8,14}$/.test(code)) return;
    debounceRef.current = setTimeout(async () => {
      setJanLoading(true);
      try {
        const data = await api.jan.lookup(code) as JanResult;
        if (data.found) {
          setForm((prev) => ({
            ...prev,
            name: prev.name || data.name,
            brand: prev.brand || data.brand,
            description: prev.description || data.description,
            price: prev.price || (data.lowestPrice ? String(Math.round(data.lowestPrice)) : ''),
            imageUrls: prev.imageUrls || data.images.join('\n'),
          }));
          setJanMsg('✓ 商品情報を取得しました');
        } else {
          setJanMsg('データベースに見つかりませんでした（国内商品は対応外の場合あり）');
        }
      } catch {
        setJanMsg('取得に失敗しました');
      } finally {
        setJanLoading(false);
      }
    }, 600);
  }

  async function handleUrlFetch() {
    const url = urlInput.trim();
    if (!url) return;
    setUrlMsg('');
    setUrlFetching(true);
    try {
      const data = await api.products.fetchUrl(url);
      setForm((prev) => ({
        ...prev,
        name: prev.name || data.name || '',
        brand: prev.brand || data.brand || '',
        description: prev.description || data.description || '',
        price: prev.price || (data.price ? String(data.price) : ''),
        imageUrls: prev.imageUrls || (data.images?.join('\n') ?? ''),
      }));
      setUrlMsg('✓ 情報を取得しました');
      setUrlInput('');
    } catch (e) {
      setUrlMsg(e instanceof Error ? e.message : '取得に失敗しました');
    } finally {
      setUrlFetching(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c] transition';
  const labelClass = 'block text-xs font-bold text-[#68746e]';

  return (
    <div className="mt-5 rounded-2xl border border-[#315c4c] bg-white">
      <div className="flex items-center justify-between border-b border-[#dce5df] px-6 py-4">
        <h2 className="font-bold text-[#1f2a25]">{title}</h2>
        <button onClick={onCancel} className="text-xl leading-none text-[#68746e] hover:text-[#1f2a25]">×</button>
      </div>
      {/* URL auto-fill */}
      <div className="border-b border-[#dce5df] px-6 py-4 bg-[#f8faf8]">
        <p className="text-xs font-bold text-[#315c4c]">🔗 URLから情報を自動入力</p>
        <p className="mt-0.5 text-xs text-[#68746e]">商品ページのURLを貼ると商品名・説明・画像を自動取得します</p>
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setUrlMsg(''); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlFetch())}
            placeholder="https://..."
            className="min-w-0 flex-1 rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c] transition"
          />
          <button
            type="button"
            onClick={handleUrlFetch}
            disabled={urlFetching || !urlInput.trim()}
            className="shrink-0 rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-50"
          >
            {urlFetching ? '取得中…' : '取得'}
          </button>
        </div>
        {urlMsg && (
          <p className={`mt-1.5 text-xs ${urlMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{urlMsg}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">

        {/* JAN code — full width */}
        <div className="sm:col-span-2">
          <label className={labelClass}>JANコード <span className="font-normal text-slate-400">（入力すると自動取得を試みます）</span></label>
          <div className="relative">
            <input type="text" inputMode="numeric" maxLength={14} value={form.janCode}
              onChange={(e) => set('janCode', e.target.value)}
              placeholder="例: 4901234567890"
              className={inputClass} />
            {janLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse text-xs text-[#315c4c]">取得中…</span>}
          </div>
          {janMsg && (
            <p className={`mt-1 text-xs ${janMsg.startsWith('✓') ? 'text-emerald-600' : 'text-slate-500'}`}>{janMsg}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>カテゴリ *</label>
          <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={inputClass}>
            <option value="">選択してください</option>
            {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className={labelClass}>ステータス</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
            <option value="active">公開中</option>
            <option value="pending">保留中</option>
            <option value="rejected">却下</option>
          </select>
        </div>

        {/* Brand */}
        <div>
          <label className={labelClass}>ブランド *</label>
          <input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="例: mont-bell" className={inputClass} />
        </div>

        {/* Price */}
        <div>
          <label className={labelClass}>参考価格（円） *</label>
          <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="例: 34800" className={inputClass} />
        </div>

        {/* Name — full width */}
        <div className="sm:col-span-2">
          <label className={labelClass}>商品名 *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例: ステラリッジ テント 2型" className={inputClass} />
        </div>

        {/* Model number */}
        <div>
          <label className={labelClass}>型番</label>
          <input value={form.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} placeholder="例: 1122363" className={inputClass} />
        </div>

        {/* Description — full width */}
        <div className="sm:col-span-2">
          <label className={labelClass}>商品説明</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3}
            placeholder="商品の特徴や用途を入力" className={`${inputClass} resize-none`} />
        </div>

        {/* Image URLs — full width */}
        <div className="sm:col-span-2">
          <label className={labelClass}>画像 URL <span className="font-normal text-slate-400">（1行に1つ、複数入力可）</span></label>
          <textarea value={form.imageUrls} onChange={(e) => set('imageUrls', e.target.value)} rows={3}
            placeholder={'https://example.com/img1.jpg\nhttps://example.com/img2.jpg'}
            className={`${inputClass} resize-none font-mono text-xs`} />
          {/* Preview thumbnails */}
          {form.imageUrls.trim() && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.imageUrls.split('\n').map((url) => url.trim()).filter(Boolean).map((url, i) => (
                <img key={i} src={url} alt="" className="h-14 w-14 rounded-lg border border-[#dce5df] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 border-t border-[#dce5df] px-6 py-4">
        <button onClick={onSave} disabled={saving || !form.categoryId || !form.brand.trim() || !form.name.trim() || !form.price}
          className="rounded-xl bg-[#315c4c] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-50">
          {saving ? '保存中…' : '保存する'}
        </button>
        <button onClick={onCancel} className="rounded-xl border border-[#dce5df] px-5 py-2.5 text-sm font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">
          キャンセル
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────
export default function AdminProducts() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products', filterStatus, filterCategoryId],
    queryFn: () => api.admin.products.list({
      status: filterStatus || undefined,
      categoryId: filterCategoryId ? parseInt(filterCategoryId, 10) : undefined,
    }),
  });

  // Form state
  const [mode, setMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editTarget, setEditTarget] = useState<AdminProductItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setForm({ ...EMPTY_FORM, categoryId: filterCategoryId || '' });
    setEditTarget(null);
    setMode('add');
  }

  function openEdit(p: AdminProductItem) {
    setForm({
      categoryId: String(p.categoryId),
      brand: p.brand,
      name: p.name,
      modelNumber: p.modelNumber,
      janCode: p.janCode ?? '',
      price: String(p.price),
      description: p.description ?? '',
      status: p.status,
      imageUrls: p.images.join('\n'),
    });
    setEditTarget(p);
    setMode('edit');
    // Scroll to form
    setTimeout(() => document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function closeForm() { setMode('none'); setEditTarget(null); }

  function formToPayload() {
    return {
      categoryId: parseInt(form.categoryId, 10),
      brand: form.brand.trim(),
      name: form.name.trim(),
      modelNumber: form.modelNumber.trim(),
      janCode: form.janCode.trim() || undefined,
      price: parseInt(form.price, 10) || 0,
      description: form.description.trim() || undefined,
      status: form.status,
      images: form.imageUrls.split('\n').map((u) => u.trim()).filter(Boolean),
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === 'add') {
        await api.admin.products.create(formToPayload());
      } else if (mode === 'edit' && editTarget) {
        await api.admin.products.update(editTarget.id, formToPayload());
      }
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      closeForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(product: AdminProductItem, newStatus: string) {
    await api.admin.products.updateStatus(product.id, newStatus);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
  }

  async function handleDelete(product: AdminProductItem) {
    if (!confirm(`「${product.name}」を削除しますか？この操作は元に戻せません。`)) return;
    await api.admin.products.delete(product.id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    if (editTarget?.id === product.id) closeForm();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1f2a25]">商品管理</h1>
        <button onClick={openAdd}
          className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f]">
          + 商品を追加
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c]">
          <option value="">すべてのステータス</option>
          <option value="active">公開中</option>
          <option value="pending">保留中</option>
          <option value="rejected">却下</option>
        </select>
        <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}
          className="rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c]">
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <span className="ml-auto self-center text-sm text-[#68746e]">{products.length} 件</span>
      </div>

      {/* Add/Edit form */}
      {mode !== 'none' && (
        <div id="product-form">
          <ProductForm
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={closeForm}
            saving={saving}
            title={mode === 'add' ? '新しい商品を追加' : `「${editTarget?.name}」を編集`}
          />
        </div>
      )}

      {/* Table */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#dce5df] bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#68746e]">読み込み中…</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#68746e]">
            商品がありません。「+ 商品を追加」から追加してください。
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#dce5df] bg-[#f8faf8]">
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">商品名</th>
                <th className="hidden px-4 py-3 text-left font-bold text-[#68746e] sm:table-cell">カテゴリ</th>
                <th className="hidden px-4 py-3 text-left font-bold text-[#68746e] md:table-cell">価格</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">ステータス</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#dce5df] transition hover:bg-[#f8faf8] ${
                    editTarget?.id === p.id ? 'bg-[#f1f6f3]' : ''
                  } ${i === products.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images[0] ? (
                        <img src={p.images[0]} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f6f3] text-lg">📦</div>
                      )}
                      <div>
                        <p className="font-bold text-[#1f2a25]">{p.name}</p>
                        <p className="text-xs text-[#68746e]">{p.brand}{p.modelNumber ? ` · ${p.modelNumber}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-[#68746e] sm:table-cell">
                    {categories.find((c) => c.id === p.categoryId)?.name ?? '-'}
                  </td>
                  <td className="hidden px-4 py-3 text-[#1f2a25] md:table-cell">
                    ¥{p.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button onClick={() => openEdit(p)}
                        className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100">
                        編集
                      </button>
                      {p.status !== 'active' && (
                        <button onClick={() => handleStatusChange(p, 'active')}
                          className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100">
                          公開
                        </button>
                      )}
                      {p.status === 'active' && (
                        <button onClick={() => handleStatusChange(p, 'pending')}
                          className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100">
                          保留
                        </button>
                      )}
                      <button onClick={() => handleDelete(p)}
                        className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100">
                        削除
                      </button>
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
