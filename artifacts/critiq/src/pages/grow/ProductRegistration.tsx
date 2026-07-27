import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

type FormState = {
  categoryId: string;
  referenceUrl: string;
  brand: string;
  name: string;
  modelNumber: string;
  price: string;
  janCode: string;
  description: string;
};

type JanResult = { found: true; name: string; brand: string; description: string; images: string[]; lowestPrice: number | null }
  | { found: false };

// ── Star rating input ────────────────────────────────────────
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(value === star ? 0 : star)}
          className="text-2xl leading-none transition"
          aria-label={`${star}点`}
        >
          {(hover || value) >= star ? '⭐' : '☆'}
        </button>
      ))}
      {value > 0 && (
        <button type="button" onClick={() => onChange(0)} className="ml-1 text-xs text-slate-400 hover:text-slate-600">
          クリア
        </button>
      )}
    </div>
  );
}

// ── Category suggestion modal ────────────────────────────────
function CategorySuggestModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('カテゴリ名を入力してください'); return; }
    setSubmitting(true);
    try {
      await api.suggestions.createCategory({ name: name.trim(), description: description.trim() || undefined });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {done ? (
          <>
            <p className="text-center text-4xl">🎉</p>
            <h3 className="mt-3 text-center text-lg font-bold">ありがとうございます！</h3>
            <p className="mt-2 text-center text-sm text-[#68746e]">カテゴリの提案を受け付けました。運営が確認します。</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl bg-[#315c4c] py-3 font-bold text-white">
              閉じる
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1f2a25]">カテゴリを提案する</h3>
              <button type="button" onClick={onClose} className="text-xl text-[#68746e]">×</button>
            </div>
            <p className="mt-1 text-xs text-[#68746e]">希望するカテゴリ名を自由に入力してください。</p>
            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#68746e]">カテゴリ名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder="例: 登山靴、ランタン など"
                  className="mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#68746e]">補足（任意）</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="どのような商品を比較したいかなど"
                  className="mt-1 w-full resize-none rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#315c4c] py-3 font-bold text-white disabled:opacity-60">
                {submitting ? '送信中…' : '提案を送信する'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function ProductRegistration() {
  const { user, loading } = useUser();
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const [form, setForm] = useState<FormState>({ categoryId: '', referenceUrl: '', brand: '', name: '', modelNumber: '', price: '', janCode: '', description: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [janLoading, setJanLoading] = useState(false);
  const [janError, setJanError] = useState('');
  const [fetchedImages, setFetchedImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCategorySuggest, setShowCategorySuggest] = useState(false);
  const [pendingRatings, setPendingRatings] = useState<Record<number, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch criteria for selected category (for pending ratings)
  const categoryIdNum = form.categoryId ? parseInt(form.categoryId, 10) : 0;
  const { data: categoryCriteria = [] } = useQuery({
    queryKey: ['criteria', categoryIdNum],
    queryFn: () => api.criteria.list(categoryIdNum),
    enabled: !!categoryIdNum,
  });

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    if (key === 'categoryId') setPendingRatings({});
    if (key === 'janCode') triggerJanLookup(value);
  }

  function triggerJanLookup(code: string) {
    setJanError('');
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
          }));
          setFetchedImages(data.images);
        } else {
          setJanError('このJANコードでは商品情報が見つかりませんでした');
        }
      } catch {
        setJanError('取得に失敗しました。後で試してください');
      } finally {
        setJanLoading(false);
      }
    }, 600);
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      const urls = await Promise.all(Array.from(files).map((file) => api.upload.image(file)));
      setUploadedImages((prev) => [...prev, ...urls]);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'アップロードに失敗しました');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function addUrlImage() {
    const url = urlInput.trim();
    if (!url) return;
    try { new URL(url); } catch { alert('有効なURLを入力してください'); return; }
    setUploadedImages((prev) => [...prev, url]);
    setUrlInput('');
  }

  function removeImage(url: string, source: 'fetched' | 'uploaded') {
    if (source === 'fetched') setFetchedImages((prev) => prev.filter((u) => u !== url));
    else setUploadedImages((prev) => prev.filter((u) => u !== url));
  }

  function validate() {
    const e: Partial<FormState> = {};
    if (!form.categoryId) e.categoryId = 'カテゴリを選択してください';
    if (!form.name.trim()) e.name = '商品名を入力してください';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const hasRatings = Object.values(pendingRatings).some((v) => v > 0);
      await api.suggestions.createProduct({
        categoryId: parseInt(form.categoryId, 10),
        brand: form.brand || undefined,
        name: form.name,
        modelNumber: form.modelNumber || undefined,
        janCode: form.janCode || undefined,
        price: form.price ? parseInt(form.price.replace(/[^0-9]/g, ''), 10) : undefined,
        description: form.description || undefined,
        referenceUrl: form.referenceUrl || undefined,
        images: [...fetchedImages, ...uploadedImages],
        pendingRatings: hasRatings ? pendingRatings : undefined,
      });
      setDone(true);
    } catch (err) {
      setErrors({ name: err instanceof Error ? err.message : '送信に失敗しました' });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm outline-none focus:border-[#315c4c] transition';
  const errorClass = 'mt-1 text-xs text-red-500';
  const labelClass = 'block text-sm font-bold text-[#1f2a25]';
  const allImages = [...fetchedImages, ...uploadedImages];

  const header = (
    <div className="flex items-center justify-between px-5 pt-8">
      <Link href="/grow" className="text-sm font-bold text-[#315c4c]">← 育てる</Link>
      <Link href="/explore" className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">← 探す</Link>
    </div>
  );

  if (done) {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-[#f8faf8] px-5 pb-12">
          <span className="text-6xl" aria-hidden="true">📦</span>
          <h1 className="mt-6 text-2xl font-bold">登録申請を送信しました！</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#68746e]">商品情報を受け取りました。<br />運営の確認後に反映されます。</p>
          <div className="mt-8 w-full space-y-3">
            <button type="button" onClick={() => {
              setForm({ categoryId: '', referenceUrl: '', brand: '', name: '', modelNumber: '', price: '', janCode: '', description: '' });
              setFetchedImages([]); setUploadedImages([]); setPendingRatings({}); setDone(false);
            }} className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]">
              別の商品を登録する
            </button>
            <Link href="/grow" className="block w-full rounded-2xl border border-[#dce5df] px-5 py-4 text-center font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">
              育てるに戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }


  return (
    <>
      {showCategorySuggest && <CategorySuggestModal onClose={() => setShowCategorySuggest(false)} />}
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
          {header}
          <div className="px-5 pt-7">
            <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
            <h1 className="mt-2 text-2xl font-bold">商品を登録する</h1>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">まだ登録されていない商品の情報を教えてください。</p>
          </div>
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5 px-5">
            {/* Reference URL */}
            <div>
              <label className={labelClass}>参考ページURL <span className="text-slate-400 font-normal text-xs">（任意）</span></label>
              <input type="url" value={form.referenceUrl} onChange={(e) => set('referenceUrl', e.target.value)} placeholder="例: https://www.amazon.co.jp/dp/..." className={`${inputClass} mt-2`} />
            </div>

            {/* Category */}
            <div>
              <label className={labelClass}>カテゴリ <span className="text-red-500">*</span></label>
              <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={`${inputClass} mt-2 appearance-none`}>
                <option value="">選択してください</option>
                {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
              <button
                type="button"
                onClick={() => setShowCategorySuggest(true)}
                className="mt-1.5 text-xs font-medium text-[#315c4c] underline underline-offset-2 hover:text-[#284b3f]"
              >
                希望するカテゴリがない場合は提案する →
              </button>
            </div>

            {/* Brand */}
            <div>
              <label className={labelClass}>メーカー名 <span className="text-slate-400 font-normal text-xs">（任意）</span></label>
              <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="例: FIELDOOR" className={`${inputClass} mt-2`} />
            </div>

            {/* Name */}
            <div>
              <label className={labelClass}>商品名 <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例: ワンタッチテント 2人用" className={`${inputClass} mt-2`} />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            {/* Model number */}
            <div>
              <label className={labelClass}>型番 <span className="text-slate-400 font-normal text-xs">（任意）</span></label>
              <input type="text" value={form.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} placeholder="例: FD-T200" className={`${inputClass} mt-2`} />
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>商品説明 <span className="text-slate-400 font-normal text-xs">（任意）</span></label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="商品の特徴や気になる点など" className={`${inputClass} mt-2 resize-none`} />
            </div>

            {/* Price */}
            <div>
              <label className={labelClass}>参考価格（円） <span className="text-slate-400 font-normal text-xs">（任意）</span></label>
              <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="例: 12800" className={`${inputClass} mt-2`} />
            </div>

            {/* Images */}
            <div>
              <label className={labelClass}>商品画像 <span className="text-slate-400 font-normal text-xs">（任意・複数可）</span></label>
              {allImages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {fetchedImages.map((img) => (
                    <div key={img} className="relative h-20 w-20 shrink-0">
                      <img src={img} alt="" className="h-full w-full rounded-xl object-cover border border-[#dce5df]" />
                      <button type="button" onClick={() => removeImage(img, 'fetched')} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">✕</button>
                    </div>
                  ))}
                  {uploadedImages.map((img) => (
                    <div key={img} className="relative h-20 w-20 shrink-0">
                      <img src={img} alt="" className="h-full w-full rounded-xl object-cover border border-[#dce5df]" />
                      <button type="button" onClick={() => removeImage(img, 'uploaded')} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                  className="flex items-center gap-1.5 rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm font-semibold text-[#315c4c] transition hover:border-[#315c4c] disabled:opacity-60">
                  {uploadingFile ? <><span className="animate-spin">⏳</span> アップロード中…</> : <><span>📁</span> ファイルを選択</>}
                </button>
                <span className="text-xs text-slate-400">最大10MB / 枚</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
              <div className="mt-2 flex gap-2">
                <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrlImage())}
                  placeholder="画像URLを入力（任意）" className={`${inputClass} flex-1`} />
                <button type="button" onClick={addUrlImage} className="shrink-0 rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm font-semibold text-[#315c4c] transition hover:border-[#315c4c]">追加</button>
              </div>
            </div>

            {/* JAN code — moved to bottom */}
            <div>
              <label className={labelClass}>JANコード <span className="text-slate-400 font-normal text-xs">（任意・入力すると自動取得）</span></label>
              <div className="relative mt-2">
                <input type="text" inputMode="numeric" value={form.janCode} onChange={(e) => set('janCode', e.target.value)} placeholder="例: 4901234567890" className={inputClass} maxLength={14} />
                {janLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#315c4c] animate-pulse">取得中…</span>}
              </div>
              {janError && <p className={errorClass}>{janError}</p>}
            </div>

            {/* Pending ratings — shown when category has criteria */}
            {categoryIdNum > 0 && categoryCriteria.length > 0 && (
              <div className="rounded-2xl border border-[#dce5df] bg-[#f1f6f3] p-4">
                <p className="text-sm font-bold text-[#315c4c]">⭐ 基準ごとの評価（任意）</p>
                <p className="mt-1 text-xs leading-5 text-[#68746e]">
                  この商品を知っていれば、評価も一緒に送れます。承認後に反映されます。
                </p>
                <div className="mt-3 space-y-4">
                  {categoryCriteria.map((criterion) => (
                    <div key={criterion.id}>
                      <p className="text-sm font-semibold text-[#1f2a25]">{criterion.name}</p>
                      {criterion.description && (
                        <p className="text-xs text-[#68746e]">{criterion.description}</p>
                      )}
                      <div className="mt-1">
                        <StarInput
                          value={pendingRatings[criterion.id] ?? 0}
                          onChange={(v) => setPendingRatings((prev) => ({ ...prev, [criterion.id]: v }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-60">
              {submitting ? '送信中…' : '登録申請を送信する'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
