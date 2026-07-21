import { useState } from 'react';
import { Link } from 'wouter';
import { categories } from '@/data/categories';

type FormState = {
  categoryId: string;
  name: string;
  description: string;
  reason: string;
};

const STORAGE_KEY = 'critiq_pending_criteria';

function saveCriterion(form: FormState) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[];
  existing.push({ id: crypto.randomUUID(), ...form, timestamp: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export default function CriterionSuggestion() {
  const [form, setForm] = useState<FormState>({ categoryId: '', name: '', description: '', reason: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [done, setDone] = useState(false);

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validate() {
    const e: Partial<FormState> = {};
    if (!form.categoryId) e.categoryId = 'カテゴリを選択してください';
    if (!form.name.trim()) e.name = '基準名を入力してください';
    if (!form.description.trim()) e.description = '説明を入力してください';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    saveCriterion(form);
    setDone(true);
  }

  const inputClass = 'w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm outline-none focus:border-[#315c4c] transition';
  const labelClass = 'block text-sm font-bold text-[#1f2a25]';
  const errorClass = 'mt-1 text-xs text-red-500';

  const header = (
    <div className="flex items-center justify-between px-5 pt-8">
      <Link href="/grow" className="text-sm font-bold text-[#315c4c]">← 育てる</Link>
      <Link href="/explore" className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">
        ← 探す
      </Link>
    </div>
  );

  if (done) {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-[#f8faf8] px-5 pb-12">
          <span className="text-6xl" aria-hidden="true">💡</span>
          <h1 className="mt-6 text-2xl font-bold">提案を送信しました！</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#68746e]">
            新しい基準の提案ありがとうございます。<br />検討のうえ追加します。
          </p>
          <div className="mt-8 w-full space-y-3">
            <button
              type="button"
              onClick={() => { setForm({ categoryId: '', name: '', description: '', reason: '' }); setDone(false); }}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]"
            >
              別の基準を提案する
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
          <h1 className="mt-2 text-2xl font-bold">基準を追加する</h1>
          <p className="mt-2 text-sm leading-6 text-[#68746e]">
            既存の基準にない、新しい比較軸を提案してください。
          </p>
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

          {/* 基準名 */}
          <div>
            <label className={labelClass}>基準名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例: 結露しにくさ" className={`${inputClass} mt-2`} />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          {/* 説明 */}
          <div>
            <label className={labelClass}>説明 <span className="text-red-500">*</span></label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="例: 夜間の温度差で内側に水滴が付きにくいか"
              rows={3}
              className={`${inputClass} mt-2 resize-none`}
            />
            {errors.description && <p className={errorClass}>{errors.description}</p>}
          </div>

          {/* 追加理由 */}
          <div>
            <label className={labelClass}>
              追加してほしい理由 <span className="text-slate-400 font-normal text-xs">（任意）</span>
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="例: 冬キャンプでは結露が特に重要で、既存の基準では判断できなかった"
              rows={3}
              className={`${inputClass} mt-2 resize-none`}
            />
          </div>

          <button type="submit" className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]">
            提案を送信する
          </button>
        </form>
      </div>
    </main>
  );
}
