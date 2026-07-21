import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import type { ApiCriterion, ApiProduct } from '@/types/api';

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          className="text-3xl leading-none transition-transform active:scale-90" aria-label={`${star}点`}>
          <span className={star <= display ? 'text-amber-400' : 'text-slate-200'}>★</span>
        </button>
      ))}
    </div>
  );
}

type Step = 'form' | 'similar' | 'rate' | 'done';
type FormState = { categoryId: string; name: string; description: string; reason: string; };

const inputClass = 'w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm outline-none focus:border-[#315c4c] transition';
const labelClass = 'block text-sm font-bold text-[#1f2a25]';
const errorClass = 'mt-1 text-xs text-red-500';

function CriterionBadge({ criterion }: { criterion: ApiCriterion }) {
  if (criterion.isOfficial) {
    return <span className="rounded-full bg-[#e8f0eb] px-2 py-0.5 text-[10px] font-bold text-[#315c4c]">公式</span>;
  }
  if (criterion.createdByUsername) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">by {criterion.createdByUsername}</span>;
  }
  return null;
}

export default function CriterionSuggestion() {
  const { user } = useUser();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.categories.list() });

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormState>({ categoryId: '', name: '', description: '', reason: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);

  const categoryIdNum = form.categoryId ? parseInt(form.categoryId, 10) : 0;

  // Fetch existing criteria for selected category
  const { data: existingCriteria = [] } = useQuery({
    queryKey: ['criteria', categoryIdNum],
    queryFn: () => api.criteria.list(categoryIdNum),
    enabled: !!categoryIdNum,
  });

  const similarCriteria = form.name.trim()
    ? existingCriteria.filter((c) => {
        const n = form.name.trim().toLowerCase();
        return c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase());
      })
    : [];

  // Products for selected category (for the rate step)
  const { data: categoryProducts = [] } = useQuery({
    queryKey: ['products', categoryIdNum],
    queryFn: () => api.products.list(categoryIdNum),
    enabled: !!categoryIdNum,
  });

  const [newCriterionName, setNewCriterionName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [score, setScore] = useState(0);

  const filteredProducts = categoryProducts.filter(
    (p) => p.name.includes(productQuery) || p.brand.toLowerCase().includes(productQuery.toLowerCase()),
  );

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

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (similarCriteria.length > 0) {
      setStep('similar');
    } else {
      commitSuggestion();
    }
  }

  async function commitSuggestion() {
    setSubmitting(true);
    try {
      await api.suggestions.createCriterion({
        categoryId: categoryIdNum,
        name: form.name.trim(),
        description: form.description.trim(),
        reason: form.reason.trim() || undefined,
        submitterUsername: user?.username ?? undefined,
      });
      setNewCriterionName(form.name.trim());
      setStep('rate');
    } catch (err) {
      setErrors({ name: err instanceof Error ? err.message : '送信に失敗しました' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRatingSubmit() {
    setStep('done');
  }

  const header = (
    <div className="flex items-center justify-between px-5 pt-8">
      {step === 'similar' ? (
        <button type="button" onClick={() => setStep('form')} className="text-sm font-bold text-[#315c4c]">← 戻る</button>
      ) : step === 'rate' ? (
        <span className="text-sm font-bold text-[#315c4c]">CRITIQ</span>
      ) : (
        <Link href="/grow" className="text-sm font-bold text-[#315c4c]">← 育てる</Link>
      )}
      <Link href="/explore" className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">← 探す</Link>
    </div>
  );

  if (step === 'done') {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-[#f8faf8] px-5 pb-12">
          <span className="text-6xl" aria-hidden="true">✨</span>
          <h1 className="mt-6 text-2xl font-bold">提案を送信しました！</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#68746e]">
            「{newCriterionName}」の提案ありがとうございます。<br />運営の確認後に反映されます。
          </p>
          <div className="mt-8 w-full space-y-3">
            <button type="button"
              onClick={() => { setStep('form'); setForm({ categoryId: '', name: '', description: '', reason: '' }); setNewCriterionName(''); setScore(0); setSelectedProductId(null); }}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]">
              別の基準を提案する
            </button>
            <Link href="/grow" className="block w-full rounded-2xl border border-[#dce5df] px-5 py-4 text-center font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">育てるに戻る</Link>
          </div>
        </div>
      </main>
    );
  }

  if (step === 'rate') {
    const selectedProduct = categoryProducts.find((p) => p.id === selectedProductId);
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-28">
          {header}
          <div className="px-5 pt-5">
            <div className="rounded-2xl border border-[#4d7c67] bg-[#f1f6f3] p-4">
              <p className="text-xs font-bold text-[#315c4c]">提案した基準</p>
              <p className="mt-1 font-bold text-[#1f2a25]">{newCriterionName}</p>
            </div>
            <h2 className="mt-6 text-lg font-bold">この基準で商品を評価する</h2>
            <p className="mt-1 text-sm text-[#68746e]">スキップして後で評価することもできます。</p>
          </div>
          <div className="mt-4 px-5">
            <div className="flex items-center rounded-2xl border border-[#dce5df] bg-white px-4 shadow-sm">
              <span className="mr-3 text-lg" aria-hidden="true">🔍</span>
              <input type="search" value={productQuery} onChange={(e) => setProductQuery(e.target.value)}
                placeholder="商品名で検索" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#9aa49f]" />
            </div>
          </div>
          <div className="mt-3 space-y-2 px-5">
            {(productQuery ? filteredProducts : categoryProducts).map((p) => (
              <button key={p.id} type="button" onClick={() => setSelectedProductId(p.id === selectedProductId ? null : p.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${p.id === selectedProductId ? 'border-[#315c4c] bg-[#f1f6f3]' : 'border-[#dce5df] bg-white hover:border-[#315c4c]'}`}>
                {p.images?.[0] && <img src={p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <p className="font-bold text-[#1f2a25]">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.brand} · {p.modelNumber}</p>
                </div>
                {p.id === selectedProductId && <span className="ml-auto text-[#315c4c]">✓</span>}
              </button>
            ))}
          </div>
          {selectedProduct && (
            <div className="mt-5 px-5">
              <div className="rounded-2xl border border-[#dce5df] bg-white p-5">
                <p className="text-sm font-bold text-[#1f2a25]">{selectedProduct.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">での「{newCriterionName}」の評価</p>
                <div className="mt-4 flex items-center gap-3">
                  <StarInput value={score} onChange={setScore} />
                  {score === 0 && <span className="text-xs text-slate-400">タップして評価</span>}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[480px] space-y-2 border-t border-[#dce5df] bg-[#f8faf8] px-5 py-4">
          {selectedProductId ? (
            <button type="button" onClick={handleRatingSubmit}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]">
              {score > 0 ? '評価して完了する' : '評価せずに完了する'}
            </button>
          ) : (
            <button type="button" onClick={() => setStep('done')}
              className="w-full rounded-2xl border border-[#dce5df] px-5 py-4 font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">
              スキップして完了する
            </button>
          )}
        </div>
      </main>
    );
  }

  if (step === 'similar') {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
          {header}
          <div className="px-5 pt-7">
            <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
            <h1 className="mt-2 text-2xl font-bold">似た基準があります</h1>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">「{form.name}」に近い基準がすでに存在します。これらで賄えませんか？</p>
          </div>
          <div className="mt-5 space-y-3 px-5">
            {similarCriteria.map((c) => (
              <div key={c.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="font-bold text-[#1f2a25]">{c.name}</p>
                    {c.description && <p className="mt-1 text-xs leading-5 text-[#68746e]">{c.description}</p>}
                  </div>
                  <CriterionBadge criterion={c} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3 px-5">
            <button type="button" onClick={() => setStep('form')}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]">
              既存の基準を使う
            </button>
            <button type="button" onClick={commitSuggestion} disabled={submitting}
              className="w-full rounded-2xl border border-[#dce5df] px-5 py-4 font-bold text-[#315c4c] transition hover:bg-[#f1f6f3] disabled:opacity-60">
              それでも「{form.name}」を追加する
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── FORM step ────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
        {header}
        <div className="px-5 pt-7">
          <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
          <h1 className="mt-2 text-2xl font-bold">基準を提案する</h1>
          <p className="mt-2 text-sm leading-6 text-[#68746e]">新しい比較軸を提案できます。運営が確認して反映します。</p>
          {user && (
            <p className="mt-2 text-xs text-[#68746e]">提案者として「{user.username ?? user.email}」が表示されます。</p>
          )}
        </div>
        <form onSubmit={handleFormSubmit} noValidate className="mt-6 space-y-5 px-5">
          <div>
            <label className={labelClass}>カテゴリ <span className="text-red-500">*</span></label>
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={`${inputClass} mt-2 appearance-none`}>
              <option value="">選択してください</option>
              {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
          </div>

          {/* Show existing criteria for selected category */}
          {categoryIdNum > 0 && existingCriteria.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#315c4c] mb-2">このカテゴリの既存基準</p>
              <div className="rounded-xl border border-[#dce5df] bg-white divide-y divide-[#f0f4f1]">
                {existingCriteria.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[#1f2a25]">{c.name}</span>
                    </div>
                    <CriterionBadge criterion={c} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>基準名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例: 結露しにくさ" className={`${inputClass} mt-2`} />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
            {similarCriteria.length > 0 && form.name.trim() && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-bold text-amber-700">似た基準あり：</p>
                {similarCriteria.map((c) => <p key={c.id} className="text-xs text-amber-700">· {c.name}</p>)}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>説明 <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="例: 夜間の温度差で内側に水滴が付きにくいか" rows={3} className={`${inputClass} mt-2 resize-none`} />
            {errors.description && <p className={errorClass}>{errors.description}</p>}
          </div>
          <div>
            <label className={labelClass}>追加してほしい理由 <span className="text-slate-400 font-normal text-xs">（任意）</span></label>
            <textarea value={form.reason} onChange={(e) => set('reason', e.target.value)}
              placeholder="例: 冬キャンプでは結露が特に重要で、既存の基準では判断できなかった" rows={3} className={`${inputClass} mt-2 resize-none`} />
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-60">
            {submitting ? '送信中…' : '提案する'}
          </button>
        </form>
      </div>
    </main>
  );
}
