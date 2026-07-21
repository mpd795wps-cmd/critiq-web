import { useState } from 'react';
import { Link } from 'wouter';
import { categories } from '@/data/categories';

type FormState = {
  categoryId: string;
  brand: string;
  name: string;
  modelNumber: string;
  price: string;
};

const STORAGE_KEY = 'critiq_pending_products';

function saveProduct(form: FormState) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[];
  existing.push({
    id: crypto.randomUUID(),
    ...form,
    price: Number(form.price.replace(/[^0-9]/g, '')),
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export default function ProductRegistration() {
  const [form, setForm] = useState<FormState>({
    categoryId: '',
    brand: '',
    name: '',
    modelNumber: '',
    price: '',
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [done, setDone] = useState(false);

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    saveProduct(form);
    setDone(true);
  }

  const inputClass =
    'w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm outline-none focus:border-[#315c4c] transition';
  const errorClass = 'mt-1 text-xs text-red-500';
  const labelClass = 'block text-sm font-bold text-[#1f2a25]';

  const header = (
    <div className="flex items-center justify-between px-5 pt-8">
      <Link href="/grow" className="text-sm font-bold text-[#315c4c]">← 育てる</Link>
      <Link
        href="/explore"
        className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
      >
        ← 探す
      </Link>
    </div>
  );

  if (done) {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-[#f8faf8] px-5 pb-12">
          <span className="text-6xl" aria-hidden="true">📦</span>
          <h1 className="mt-6 text-2xl font-bold">登録申請を送信しました！</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#68746e]">
            商品情報を受け取りました。<br />審査後に反映されます。
          </p>
          <div className="mt-8 w-full space-y-3">
            <button
              type="button"
              onClick={() => { setForm({ categoryId: '', brand: '', name: '', modelNumber: '', price: '' }); setDone(false); }}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]"
            >
              別の商品を登録する
            </button>
            <Link
              href="/grow"
              className="block w-full rounded-2xl border border-[#dce5df] px-5 py-4 text-center font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]"
            >
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

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5 px-5">
          {/* カテゴリ */}
          <div>
            <label className={labelClass}>カテゴリ <span className="text-red-500">*</span></label>
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={`${inputClass} mt-2 appearance-none`}>
              <option value="">選択してください</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
          </div>

          {/* メーカー */}
          <div>
            <label className={labelClass}>メーカー名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="例: FIELDOOR" className={`${inputClass} mt-2`} />
            {errors.brand && <p className={errorClass}>{errors.brand}</p>}
          </div>

          {/* 商品名 */}
          <div>
            <label className={labelClass}>商品名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例: ワンタッチテント 2人用" className={`${inputClass} mt-2`} />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          {/* 型番 */}
          <div>
            <label className={labelClass}>型番 <span className="text-red-500">*</span></label>
            <input type="text" value={form.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} placeholder="例: FD-T200" className={`${inputClass} mt-2`} />
            {errors.modelNumber && <p className={errorClass}>{errors.modelNumber}</p>}
          </div>

          {/* 価格 */}
          <div>
            <label className={labelClass}>参考価格（円） <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="例: 12800" className={`${inputClass} mt-2`} />
            {errors.price && <p className={errorClass}>{errors.price}</p>}
          </div>

          <button type="submit" className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]">
            登録申請を送信する
          </button>
        </form>
      </div>
    </main>
  );
}
