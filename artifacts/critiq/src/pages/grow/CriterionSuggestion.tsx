import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { categories } from '@/data/categories';
import {
  getAllCriteriaForCategory,
  findSimilarCriteria,
  addLiveCriterion,
  type CriterionDefinition,
} from '@/data/criteria';
import { products } from '@/data/products';

// ── StarInput ────────────────────────────────────────────────
function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl leading-none transition-transform active:scale-90"
          aria-label={`${star}点`}
        >
          <span className={star <= display ? 'text-amber-400' : 'text-slate-200'}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────
type Step = 'form' | 'similar' | 'rate' | 'done';

type FormState = {
  categoryId: string;
  name: string;
  description: string;
  reason: string;
};

const RATINGS_KEY = 'critiq_user_ratings';

function saveRating(productId: string, scores: Record<string, number>) {
  const existing = JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '[]') as unknown[];
  existing.push({ id: crypto.randomUUID(), productId, scores, timestamp: new Date().toISOString() });
  localStorage.setItem(RATINGS_KEY, JSON.stringify(existing));
}

const inputClass = 'w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm outline-none focus:border-[#315c4c] transition';
const labelClass = 'block text-sm font-bold text-[#1f2a25]';
const errorClass = 'mt-1 text-xs text-red-500';

// ── Page ─────────────────────────────────────────────────────
export default function CriterionSuggestion() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormState>({ categoryId: '', name: '', description: '', reason: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [similarCriteria, setSimilarCriteria] = useState<CriterionDefinition[]>([]);
  const [newCriterion, setNewCriterion] = useState<CriterionDefinition | null>(null);

  // Rating step state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});

  // Products in the same category
  const categoryProducts = products.filter((p) => p.categoryId === form.categoryId || p.categoryId === form.categoryId.replace(/s$/, ''));

  const filteredProducts = categoryProducts.filter(
    (p) =>
      p.name.includes(productQuery) ||
      p.brand.toLowerCase().includes(productQuery.toLowerCase()),
  );

  // Check similarity as user types name (debounced via effect)
  useEffect(() => {
    if (!form.categoryId || !form.name.trim()) { setSimilarCriteria([]); return; }
    const found = findSimilarCriteria(form.categoryId, form.name.trim());
    setSimilarCriteria(found);
  }, [form.categoryId, form.name]);

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

  // "提案する" clicked — check for similar first
  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (similarCriteria.length > 0) {
      // Show similar criteria dialog
      setStep('similar');
    } else {
      commitCriterion();
    }
  }

  // Actually save and move to rating
  function commitCriterion() {
    const criterion: CriterionDefinition & { categoryId: string } = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
    };
    addLiveCriterion(criterion);
    setNewCriterion(criterion);
    setStep('rate');
  }

  // Submit rating
  function handleRatingSubmit() {
    if (!selectedProductId || !newCriterion) return;
    const ratedCount = Object.values(scores).filter((v) => v > 0).length;
    if (ratedCount > 0) {
      saveRating(selectedProductId, scores);
    }
    setStep('done');
  }

  const header = (
    <div className="flex items-center justify-between px-5 pt-8">
      {step === 'similar' ? (
        <button type="button" onClick={() => setStep('form')} className="text-sm font-bold text-[#315c4c]">
          ← 戻る
        </button>
      ) : step === 'rate' ? (
        <span className="text-sm font-bold text-[#315c4c]">CRITIQ</span>
      ) : (
        <Link href="/grow" className="text-sm font-bold text-[#315c4c]">← 育てる</Link>
      )}
      <Link
        href="/explore"
        className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
      >
        ← 探す
      </Link>
    </div>
  );

  // ── Done ─────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-[#f8faf8] px-5 pb-12">
          <span className="text-6xl" aria-hidden="true">✨</span>
          <h1 className="mt-6 text-2xl font-bold">基準を追加しました！</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#68746e]">
            「{newCriterion?.name}」がすぐに使えるようになりました。<br />
            {Object.values(scores).filter((v) => v > 0).length > 0 && '評価もありがとうございます。'}
          </p>
          <div className="mt-8 w-full space-y-3">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setForm({ categoryId: '', name: '', description: '', reason: '' });
                setSimilarCriteria([]);
                setNewCriterion(null);
                setScores({});
                setSelectedProductId('');
              }}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]"
            >
              別の基準を追加する
            </button>
            <Link href="/grow" className="block w-full rounded-2xl border border-[#dce5df] px-5 py-4 text-center font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">
              育てるに戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Rate step ────────────────────────────────────────────────
  if (step === 'rate' && newCriterion) {
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-28">
          {header}

          <div className="px-5 pt-5">
            <div className="rounded-2xl border border-[#4d7c67] bg-[#f1f6f3] p-4">
              <p className="text-xs font-bold text-[#315c4c]">追加した基準</p>
              <p className="mt-1 font-bold text-[#1f2a25]">{newCriterion.name}</p>
              {newCriterion.description && (
                <p className="mt-0.5 text-xs text-[#68746e]">{newCriterion.description}</p>
              )}
            </div>

            <h2 className="mt-6 text-lg font-bold">この基準で商品を評価する</h2>
            <p className="mt-1 text-sm text-[#68746e]">スキップして後で評価することもできます。</p>
          </div>

          {/* 商品選択 */}
          <div className="mt-4 px-5">
            <div className="flex items-center rounded-2xl border border-[#dce5df] bg-white px-4 shadow-sm">
              <span className="mr-3 text-lg" aria-hidden="true">🔍</span>
              <input
                type="search"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="商品名で検索"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#9aa49f]"
              />
            </div>
          </div>

          <div className="mt-3 space-y-2 px-5">
            {(productQuery ? filteredProducts : categoryProducts).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProductId(p.id === selectedProductId ? '' : p.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  p.id === selectedProductId
                    ? 'border-[#315c4c] bg-[#f1f6f3]'
                    : 'border-[#dce5df] bg-white hover:border-[#315c4c]'
                }`}
              >
                {p.images?.[0] && (
                  <img src={p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="font-bold text-[#1f2a25]">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.brand} · {p.modelNumber}</p>
                </div>
                {p.id === selectedProductId && (
                  <span className="ml-auto text-[#315c4c]">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* 星評価 (商品選択後) */}
          {selectedProduct && (
            <div className="mt-5 px-5">
              <div className="rounded-2xl border border-[#dce5df] bg-white p-5">
                <p className="text-sm font-bold text-[#1f2a25]">{selectedProduct.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">での「{newCriterion.name}」の評価</p>
                <div className="mt-4 flex items-center gap-3">
                  <StarInput
                    value={scores[newCriterion.id] ?? 0}
                    onChange={(n) => setScores({ [newCriterion.id]: n })}
                  />
                  {(scores[newCriterion.id] ?? 0) === 0 && (
                    <span className="text-xs text-slate-400">タップして評価</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[480px] space-y-2 border-t border-[#dce5df] bg-[#f8faf8] px-5 py-4">
          {selectedProductId ? (
            <button
              type="button"
              onClick={handleRatingSubmit}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]"
            >
              {(scores[newCriterion.id] ?? 0) > 0 ? '評価して完了する' : '評価せずに完了する'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep('done')}
              className="w-full rounded-2xl border border-[#dce5df] px-5 py-4 font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]"
            >
              スキップして完了する
            </button>
          )}
        </div>
      </main>
    );
  }

  // ── Similar criteria warning ──────────────────────────────────
  if (step === 'similar') {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
          {header}

          <div className="px-5 pt-7">
            <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
            <h1 className="mt-2 text-2xl font-bold">似た基準があります</h1>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">
              「{form.name}」に近い基準がすでに存在します。これらで賄えませんか？
            </p>
          </div>

          <div className="mt-5 space-y-3 px-5">
            {similarCriteria.map((c) => (
              <div key={c.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-bold text-[#1f2a25]">{c.name}</p>
                {c.description && (
                  <p className="mt-1 text-xs leading-5 text-[#68746e]">{c.description}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 px-5">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]"
            >
              既存の基準を使う
            </button>
            <button
              type="button"
              onClick={commitCriterion}
              className="w-full rounded-2xl border border-[#dce5df] px-5 py-4 font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]"
            >
              それでも「{form.name}」を追加する
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Form step ────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
        {header}
        <div className="px-5 pt-7">
          <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
          <h1 className="mt-2 text-2xl font-bold">基準を追加する</h1>
          <p className="mt-2 text-sm leading-6 text-[#68746e]">
            新しい比較軸を追加するとすぐに反映されます。
          </p>
        </div>

        <form onSubmit={handleFormSubmit} noValidate className="mt-6 space-y-5 px-5">
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
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="例: 結露しにくさ"
              className={`${inputClass} mt-2`}
            />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
            {/* Inline similarity hint */}
            {similarCriteria.length > 0 && form.name.trim() && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-bold text-amber-700">似た基準あり：</p>
                {similarCriteria.map((c) => (
                  <p key={c.id} className="text-xs text-amber-700">· {c.name}</p>
                ))}
              </div>
            )}
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
            追加する
          </button>
        </form>
      </div>
    </main>
  );
}
