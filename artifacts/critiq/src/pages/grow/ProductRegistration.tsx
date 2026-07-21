import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type FormState = {
  categoryId: string;
  brand: string;
  name: string;
  modelNumber: string;
  price: string;
  janCode: string;
  description: string;
};

type JanResult = { found: true; name: string; brand: string; description: string; images: string[]; lowestPrice: number | null }
  | { found: false };

export default function ProductRegistration() {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const [form, setForm] = useState<FormState>({ categoryId: '', brand: '', name: '', modelNumber: '', price: '', janCode: '', description: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [janLoading, setJanLoading] = useState(false);
  const [janError, setJanError] = useState('');
  const [fetchedImages, setFetchedImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL fetch state
  const [productUrlInput, setProductUrlInput] = useState('');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState('');

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
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

  async function handleUrlFetch() {
    const url = productUrlInput.trim();
    if (!url) return;
    setUrlFetchError('');
    setUrlFetching(true);
    try {
      const data = await api.products.fetchUrl(url);
      setForm((prev) => ({
        ...prev,
        name: prev.name || data.name || '',
        brand: prev.brand || data.brand || '',
        description: prev.description || data.description || '',
        price: prev.price || (data.price ? String(data.price) : ''),
      }));
      if (data.images?.length) {
        setFetchedImages((prev) => {
          const merged = [...prev, ...data.images.filter((u: string) => !prev.includes(u))];
          return merged;
        });
      }
      setProductUrlInput('');
    } catch (e) {
      setUrlFetchError(e instanceof Error ? e.message : '取得に失敗しました');
    } finally {
      setUrlFetching(false);
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map((file) => api.upload.image(file))
      );
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
    if (!form.brand.trim()) e.brand = 'メーカー名を入力してください';
    if (!form.name.trim()) e.name = '商品名を入力してください';
    if (!form.modelNumber.trim()) e.modelNumber = '型番を入力してください';
    if (!form.price.trim()) e.price = '価格を入力してください';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await api.suggestions.createProduct({
        categoryId: parseInt(form.categoryId, 10),
        brand: form.brand,
        name: form.name,
        modelNumber: form.modelNumber,
        janCode: form.janCode || undefined,
        price: form.price ? parseInt(form.price.replace(/[^0-9]/g, ''), 10) : undefined,
        description: form.description || undefined,
        images: [...fetchedImages, ...uploadedImages],
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
              setForm({ categoryId: '', brand: '', name: '', modelNumber: '', price: '', janCode: '', description: '' });
              setFetchedImages([]); setUploadedImages([]); setDone(false);
            }}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]">
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
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
        {header}
        <div className="px-5 pt-7">
          <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
          <h1 className="mt-2 text-2xl font-bold">商品を登録する</h1>
          <p className="mt-2 text-sm leading-6 text-[#68746e]">まだ登録されていない商品の情報を教えてください。</p>
        </div>

        {/* URL auto-fill */}
        <div className="mx-5 mt-5 rounded-2xl border border-[#315c4c]/30 bg-[#f1f6f3] p-4">
          <p className="text-sm font-bold text-[#315c4c]">🔗 URLから情報を自動入力</p>
          <p className="mt-1 text-xs leading-5 text-[#68746e]">
            メーカーサイトやAmazon、楽天などの商品ページURLを貼ると、商品名・説明・画像を自動で取得します。
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="url"
              value={productUrlInput}
              onChange={(e) => { setProductUrlInput(e.target.value); setUrlFetchError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlFetch())}
              placeholder="https://..."
              className="min-w-0 flex-1 rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c] transition"
            />
            <button
              type="button"
              onClick={handleUrlFetch}
              disabled={urlFetching || !productUrlInput.trim()}
              className="shrink-0 rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-50"
            >
              {urlFetching ? '取得中…' : '取得'}
            </button>
          </div>
          {urlFetchError && <p className="mt-2 text-xs text-red-500">{urlFetchError}</p>}
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5 px-5">
          {/* JAN code */}
          <div>
            <label className={labelClass}>JANコード <span className="text-slate-400 font-normal text-xs">（入力すると自動取得）</span></label>
            <div className="relative mt-2">
              <input type="text" inputMode="numeric" value={form.janCode} onChange={(e) => set('janCode', e.target.value)} placeholder="例: 4901234567890" className={inputClass} maxLength={14} />
              {janLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#315c4c] animate-pulse">取得中…</span>}
            </div>
            {janError && <p className={errorClass}>{janError}</p>}
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>カテゴリ <span className="text-red-500">*</span></label>
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={`${inputClass} mt-2 appearance-none`}>
              <option value="">選択してください</option>
              {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
          </div>

          {/* Brand */}
          <div>
            <label className={labelClass}>メーカー名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="例: FIELDOOR" className={`${inputClass} mt-2`} />
            {errors.brand && <p className={errorClass}>{errors.brand}</p>}
          </div>

          {/* Name */}
          <div>
            <label className={labelClass}>商品名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例: ワンタッチテント 2人用" className={`${inputClass} mt-2`} />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          {/* Model number */}
          <div>
            <label className={labelClass}>型番 <span className="text-red-500">*</span></label>
            <input type="text" value={form.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} placeholder="例: FD-T200" className={`${inputClass} mt-2`} />
            {errors.modelNumber && <p className={errorClass}>{errors.modelNumber}</p>}
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>商品説明 <span className="text-slate-400 font-normal text-xs">（任意）</span></label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="URLまたはJANコードで自動取得、または手入力" className={`${inputClass} mt-2 resize-none`} />
          </div>

          {/* Price */}
          <div>
            <label className={labelClass}>参考価格（円） <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="例: 12800" className={`${inputClass} mt-2`} />
            {errors.price && <p className={errorClass}>{errors.price}</p>}
          </div>

          {/* Images */}
          <div>
            <label className={labelClass}>商品画像 <span className="text-slate-400 font-normal text-xs">（任意・複数可）</span></label>

            {/* Preview grid */}
            {allImages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {fetchedImages.map((img) => (
                  <div key={img} className="relative h-20 w-20 shrink-0">
                    <img src={img} alt="" className="h-full w-full rounded-xl object-cover border border-[#dce5df]" />
                    <button type="button" onClick={() => removeImage(img, 'fetched')}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">✕</button>
                  </div>
                ))}
                {uploadedImages.map((img) => (
                  <div key={img} className="relative h-20 w-20 shrink-0">
                    <img src={img} alt="" className="h-full w-full rounded-xl object-cover border border-[#dce5df]" />
                    <button type="button" onClick={() => removeImage(img, 'uploaded')}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* File upload */}
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="flex items-center gap-1.5 rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm font-semibold text-[#315c4c] transition hover:border-[#315c4c] disabled:opacity-60">
                {uploadingFile ? <><span className="animate-spin">⏳</span> アップロード中…</> : <><span>📁</span> ファイルを選択</>}
              </button>
              <span className="text-xs text-slate-400">最大10MB / 枚</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)} />

            {/* URL input */}
            <div className="mt-2 flex gap-2">
              <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrlImage())}
                placeholder="画像URLを入力（任意）" className={`${inputClass} flex-1`} />
              <button type="button" onClick={addUrlImage}
                className="shrink-0 rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm font-semibold text-[#315c4c] transition hover:border-[#315c4c]">
                追加
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-60">
            {submitting ? '送信中…' : '登録申請を送信する'}
          </button>
        </form>
      </div>
    </main>
  );
}
