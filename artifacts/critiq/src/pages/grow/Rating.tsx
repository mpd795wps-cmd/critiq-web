import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { products } from '@/data/products';
import { criteriaByCategory } from '@/data/criteria';
import { categories } from '@/data/categories';
import type { Product } from '@/types/product';

// ── Star input ──────────────────────────────────────────────
function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
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

// ── localStorage helpers ─────────────────────────────────────
const STORAGE_KEY = 'critiq_user_ratings';

function saveRating(productId: string, scores: Record<string, number>) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[];
  existing.push({ id: crypto.randomUUID(), productId, scores, timestamp: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

// ── Page ─────────────────────────────────────────────────────
export default function GrowRating() {
  const search = useSearch();
  const productIdFromUrl = new URLSearchParams(search).get('productId');
  const initialProduct = productIdFromUrl ? (products.find((p) => p.id === productIdFromUrl) ?? null) : null;

  const [step, setStep] = useState<'select' | 'rate' | 'done'>(initialProduct ? 'rate' : 'select');
  const [selected, setSelected] = useState<Product | null>(initialProduct);
  const [query, setQuery] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  const filteredProducts = products.filter(
    (p) =>
      p.name.includes(query) ||
      p.brand.toLowerCase().includes(query.toLowerCase()) ||
      p.modelNumber.toLowerCase().includes(query.toLowerCase()),
  );

  const criteria = selected ? (criteriaByCategory[selected.categoryId] ?? []) : [];
  const ratedCount = Object.values(scores).filter((v) => v > 0).length;
  const categoryName = selected
    ? (categories.find((c) => c.id === selected.categoryId)?.name ?? selected.categoryId)
    : '';

  function handleSubmit() {
    if (!selected || ratedCount === 0) {
      setError('少なくとも1つの基準を評価してください。');
      return;
    }
    setError('');
    saveRating(selected.id, scores);
    setStep('done');
  }

  // ── Header ──────────────────────────────────────────────────
  const header = (
    <div className="flex items-center justify-between px-5 pt-8">
      {step === 'rate' && !productIdFromUrl ? (
        <button type="button" onClick={() => setStep('select')} className="text-sm font-bold text-[#315c4c]">
          ← 商品選択に戻る
        </button>
      ) : (
        <Link href="/grow" className="text-sm font-bold text-[#315c4c]">
          ← 育てる
        </Link>
      )}
      <Link
        href="/explore"
        className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
      >
        ← 探す
      </Link>
    </div>
  );

  // ── Step: select ─────────────────────────────────────────────
  if (step === 'select') {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
          {header}
          <div className="px-5 pt-7">
            <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
            <h1 className="mt-2 text-2xl font-bold">商品を評価する</h1>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">評価したい商品を選んでください。</p>
          </div>

          {/* 検索 */}
          <div className="mt-5 px-5">
            <div className="flex items-center rounded-2xl border border-[#dce5df] bg-white px-4 shadow-sm">
              <span className="mr-3 text-lg" aria-hidden="true">🔍</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="商品名・メーカー・型番で検索"
                className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-[#9aa49f]"
              />
            </div>
          </div>

          {/* 商品一覧 */}
          <div className="mt-4 space-y-2 px-5">
            {filteredProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">商品が見つかりません</p>
            ) : (
              filteredProducts.map((p) => {
                const catName = categories.find((c) => c.id === p.categoryId)?.name ?? p.categoryId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelected(p);
                      setScores({});
                      setStep('rate');
                    }}
                    className="w-full rounded-2xl border border-[#dce5df] bg-white px-5 py-4 text-left shadow-sm transition hover:border-[#315c4c] hover:bg-[#f1f6f3]"
                  >
                    <p className="text-xs font-semibold text-[#315c4c]">{catName}</p>
                    <p className="mt-1 font-bold text-[#1f2a25]">{p.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {p.brand} · {p.modelNumber}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>
    );
  }

  // ── Step: done ───────────────────────────────────────────────
  if (step === 'done' && selected) {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-[#f8faf8] px-5 pb-12">
          <span className="text-6xl" aria-hidden="true">🎉</span>
          <h1 className="mt-6 text-2xl font-bold">評価を送信しました！</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#68746e]">
            {selected.name} への評価ありがとうございます。
            <br />あなたの評価が次の選択者の役に立ちます。
          </p>
          <div className="mt-8 w-full space-y-3">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setScores({});
                setStep('select');
              }}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]"
            >
              別の商品を評価する
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

  // ── Step: rate ───────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
        {header}

        <div className="px-5 pt-7">
          <p className="text-sm font-bold text-[#315c4c]">{categoryName}</p>
          <h1 className="mt-1 text-2xl font-bold">{selected?.name}</h1>
          <p className="mt-1 text-xs text-slate-400">
            {selected?.brand} · {selected?.modelNumber}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#68746e]">
            実際に使った経験から、各基準を5段階で評価してください。
            評価しない基準はスキップできます。
          </p>
        </div>

        {/* 基準ごとの評価 */}
        <div className="mt-5 space-y-3 px-5">
          {criteria.map((criterion) => {
            const score = scores[criterion.id] ?? 0;
            return (
              <div
                key={criterion.id}
                className={`rounded-2xl border bg-white p-5 transition ${
                  score > 0 ? 'border-[#4d7c67]' : 'border-[#dce5df]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1f2a25]">{criterion.name}</p>
                    {criterion.description && (
                      <p className="mt-1 text-xs leading-5 text-[#68746e]">{criterion.description}</p>
                    )}
                  </div>
                  {score > 0 && (
                    <span className="shrink-0 text-xs font-bold text-[#315c4c]">{score}.0</span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <StarInput
                    value={score}
                    onChange={(n) => setScores((prev) => ({ ...prev, [criterion.id]: n }))}
                  />
                  {score === 0 && (
                    <span className="text-xs text-slate-400">タップして評価</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* エラー */}
        {error && (
          <p className="mt-3 px-5 text-sm font-medium text-red-500">{error}</p>
        )}

        {/* 送信 */}
        <div className="mt-6 px-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={ratedCount === 0}
            className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {ratedCount === 0
              ? '評価を入力してください'
              : `${ratedCount}件の評価を送信する`}
          </button>
        </div>
      </div>
    </main>
  );
}
