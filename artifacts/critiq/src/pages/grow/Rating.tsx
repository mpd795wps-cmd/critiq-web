import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiProduct, ApiCriterion } from '@/types/api';

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          className="text-5xl leading-none transition-transform active:scale-90" aria-label={`${star}点`}>
          <span className={star <= display ? 'text-amber-400' : 'text-slate-200'}>★</span>
        </button>
      ))}
    </div>
  );
}

function ProductHeaderCard({ product, categoryName }: { product: ApiProduct; categoryName: string }) {
  const [mainIdx, setMainIdx] = useState(0);
  const images = product.images ?? [];
  const mainImage = images[mainIdx];
  const overallScore = product.ratings.length > 0
    ? product.ratings.reduce((s, r) => s + r.score, 0) / product.ratings.length : 0;

  return (
    <div className="bg-white">
      {mainImage && (
        <div className="relative h-52 w-full overflow-hidden bg-[#edf1ed]">
          <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
        </div>
      )}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-5 py-3">
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setMainIdx(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === mainIdx ? 'border-[#315c4c]' : 'border-transparent opacity-60'}`}>
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="px-5 pb-5 pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#315c4c]">{categoryName}</p>
        <p className="text-xs font-semibold text-[#68746e]">{product.brand}</p>
        <h2 className="mt-1 text-xl font-bold text-[#1f2a25]">{product.name}</h2>
        <p className="mt-0.5 font-mono text-xs text-slate-400">{product.modelNumber}</p>
        <div className="mt-2 flex items-baseline gap-3">
          {product.price > 0 && <span className="text-lg font-bold text-[#1f2a25]">¥{product.price.toLocaleString()}</span>}
          {product.ratings.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-amber-500">
              {'★'.repeat(Math.round(overallScore))}
              <span className="font-bold text-[#1f2a25]">{overallScore.toFixed(1)}</span>
              {product.reviewCount > 0 && <span className="text-xs text-slate-400">（{product.reviewCount}件）</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GrowRating() {
  const search = useSearch();
  const productIdFromUrl = new URLSearchParams(search).get('productId');
  const initialProductId = productIdFromUrl ? parseInt(productIdFromUrl, 10) : null;

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products-for-rating'],
    queryFn: async () => {
      const cats = await api.categories.list();
      const results = await Promise.all(cats.map((c) => api.products.list(c.id)));
      return results.flat();
    },
  });

  const { data: allCriteria = [] } = useQuery({
    queryKey: ['all-criteria-for-rating'],
    queryFn: async () => {
      const cats = await api.categories.list();
      const results = await Promise.all(cats.map((c) => api.criteria.list(c.id)));
      return results.flat();
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const initialProduct = initialProductId
    ? (allProducts.find((p) => p.id === initialProductId) ?? null)
    : null;

  const [step, setStep] = useState<'select' | 'rate' | 'done'>(initialProductId ? 'rate' : 'select');
  const [selected, setSelected] = useState<ApiProduct | null>(initialProduct);
  const [query, setQuery] = useState('');
  const [scores, setScores] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = allProducts.filter(
    (p) => p.name.includes(query) || p.brand.toLowerCase().includes(query.toLowerCase()) || p.modelNumber.toLowerCase().includes(query.toLowerCase()),
  );

  const criteria: ApiCriterion[] = selected
    ? allCriteria.filter((c) => c.categoryId === selected.categoryId)
    : [];

  const ratedCount = Object.values(scores).filter((v) => v > 0).length;
  const categoryName = selected
    ? (categories.find((c) => c.id === selected.categoryId)?.name ?? '')
    : '';

  async function handleSubmit() {
    if (!selected || ratedCount === 0) { setError('少なくとも1つの基準を評価してください。'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.products.submitRating(selected.id, scores);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <div className="flex items-center justify-between px-5 pt-8 pb-2">
      {step === 'rate' && !productIdFromUrl ? (
        <button type="button" onClick={() => setStep('select')} className="text-sm font-bold text-[#315c4c]">← 商品選択に戻る</button>
      ) : (
        <Link href="/grow" className="text-sm font-bold text-[#315c4c]">← 育てる</Link>
      )}
      <Link href="/explore" className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">← 探す</Link>
    </div>
  );

  if (step === 'select') {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
          {header}
          <div className="px-5 pt-3">
            <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
            <h1 className="mt-2 text-2xl font-bold">商品を評価する</h1>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">評価したい商品を選んでください。</p>
          </div>
          <div className="mt-5 px-5">
            <div className="flex items-center rounded-2xl border border-[#dce5df] bg-white px-4 shadow-sm">
              <span className="mr-3 text-lg" aria-hidden="true">🔍</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="商品名・メーカー・型番で検索"
                className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-[#9aa49f]" />
            </div>
          </div>
          <div className="mt-4 space-y-2 px-5">
            {filteredProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">商品が見つかりません</p>
            ) : filteredProducts.map((p) => {
              const catName = categories.find((c) => c.id === p.categoryId)?.name ?? '';
              return (
                <button key={p.id} type="button"
                  onClick={() => { setSelected(p); setScores({}); setStep('rate'); }}
                  className="flex w-full items-center gap-4 rounded-2xl border border-[#dce5df] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#315c4c] hover:bg-[#f1f6f3]">
                  {p.images[0] && <img src={p.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#315c4c]">{catName}</p>
                    <p className="mt-0.5 font-bold text-[#1f2a25]">{p.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{p.brand} · {p.modelNumber}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  if (step === 'done' && selected) {
    return (
      <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-[#f8faf8] px-5 pb-12">
          <span className="text-6xl" aria-hidden="true">🎉</span>
          <h1 className="mt-6 text-2xl font-bold">評価を送信しました！</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#68746e]">
            {selected.name} への評価ありがとうございます。<br />あなたの評価が次の選択者の役に立ちます。
          </p>
          <div className="mt-8 w-full space-y-3">
            <button type="button" onClick={() => { setSelected(null); setScores({}); setStep('select'); }}
              className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]">
              別の商品を評価する
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
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-28">
        {header}
        {selected && <ProductHeaderCard product={selected} categoryName={categoryName} />}
        <div className="px-5 pt-5">
          <h2 className="text-lg font-bold text-[#1f2a25]">基準別に評価する</h2>
          <p className="mt-1 text-sm leading-6 text-[#68746e]">実際に使った経験から各基準を5段階で。スキップ可。</p>
        </div>
        <div className="mt-4 space-y-3 px-5">
          {criteria.map((criterion) => {
            const score = scores[criterion.id] ?? 0;
            return (
              <div key={criterion.id} className={`rounded-2xl border bg-white p-5 transition ${score > 0 ? 'border-[#4d7c67]' : 'border-[#dce5df]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1f2a25]">{criterion.name}</p>
                    {criterion.description && <p className="mt-1 text-xs leading-5 text-[#68746e]">{criterion.description}</p>}
                  </div>
                  {score > 0 && <span className="shrink-0 text-xs font-bold text-[#315c4c]">{score}.0</span>}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <StarInput value={score} onChange={(n) => setScores((prev) => ({ ...prev, [criterion.id]: n }))} />
                  {score === 0 && <span className="text-xs text-slate-400">タップして評価</span>}
                </div>
              </div>
            );
          })}
        </div>
        {error && <p className="mt-3 px-5 text-sm font-medium text-red-500">{error}</p>}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[480px] border-t border-[#dce5df] bg-[#f8faf8] px-5 py-4">
        <button type="button" onClick={handleSubmit} disabled={ratedCount === 0 || submitting}
          className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f] disabled:cursor-not-allowed disabled:bg-slate-300">
          {submitting ? '送信中…' : ratedCount === 0 ? '評価を入力してください' : `${ratedCount}件の評価を送信する`}
        </button>
      </div>
    </main>
  );
}
