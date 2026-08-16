import { Link, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { TentDiagnosisAnswers } from '@/types/api';

type GuideType = 'solo' | 'family' | 'beginner';

const guides: Record<
  GuideType,
  {
    label: string;
    title: string;
    metaTitle: string;
    description: string;
    intro: string;
    points: { title: string; body: string }[];
  }
> = {
  solo: {
    label: 'ソロキャンプ',
    title: 'ソロテントおすすめ・比較',
    metaTitle: 'ソロテントおすすめ・比較｜自分に合うテントを探す｜CRITIQ',
    description:
      'ソロキャンプ向けテントを比較。設営しやすさ、軽さ、耐水性、居住性などの基準から、自分の使い方に合うソロテントを探せます。',
    intro:
      'ソロテントは、軽さだけでなく設営のしやすさや荷物を置ける広さ、雨への強さなども重要です。CRITIQでは、自分が重視する基準からテントを比較できます。',
    points: [
      {
        title: '設営しやすさ',
        body: '一人でも無理なく設営・撤収できるかを確認しましょう。',
      },
      {
        title: '持ち運びやすさ',
        body: 'バイクやコンパクトカーなら、収納サイズや重量も重要です。',
      },
      {
        title: '居住性',
        body: '就寝スペースだけでなく、荷物を置く余裕があるかも確認しましょう。',
      },
    ],
  },

  family: {
    label: 'ファミリーキャンプ',
    title: 'ファミリーテントおすすめ・比較',
    metaTitle:
      'ファミリーテントおすすめ・比較｜家族向けキャンプテントを探す｜CRITIQ',
    description:
      '家族向けキャンプテントを比較。居住性、耐水性、耐久性、設営しやすさなどから、ファミリーキャンプに合うテントを探せます。',
    intro:
      'ファミリーテントは人数だけで選ぶのではなく、居住性や設営の負担、雨の日の過ごしやすさまで考えることが大切です。',
    points: [
      {
        title: '人数と居住性',
        body: 'メーカー表記の定員だけでなく、実際にゆったり過ごせる広さを考えましょう。',
      },
      {
        title: '設営しやすさ',
        body: '大型テントほど設営負担が増えるため、必要人数や構造も確認しましょう。',
      },
      {
        title: '耐水性・耐久性',
        body: '長く使うなら、雨や風への強さも比較したいポイントです。',
      },
    ],
  },

  beginner: {
    label: 'キャンプ初心者',
    title: '初心者向けテントおすすめ・比較',
    metaTitle:
      '初心者向けテントおすすめ・比較｜初めてのキャンプテント選び｜CRITIQ',
    description:
      'キャンプ初心者向けのテント選びをサポート。設営しやすさ、耐水性、居住性などを比較しながら、自分に合うテントを探せます。',
    intro:
      '初めてのテント選びでは、価格やデザインだけでなく、設営の簡単さや使う人数、キャンプスタイルとの相性を考えることが重要です。',
    points: [
      {
        title: '設営の簡単さ',
        body: '初めてでも扱いやすい構造かどうかを重視すると失敗を減らせます。',
      },
      {
        title: '使用人数',
        body: '人数ぴったりではなく、少し余裕のあるサイズも候補に入れてみましょう。',
      },
      {
        title: '使う季節・天候',
        body: '春夏中心なのか、雨や寒い時期にも使うのかで必要な性能が変わります。',
      },
    ],
  },
};


const diagnosisPresets: Record<GuideType, Omit<TentDiagnosisAnswers, 'categoryId'>> = {
  solo: {
    adults: 1,
    children: 0,
    experience: 'some',
    setupPeople: 1,
    maxBudget: 80000,
    priorities: ['setup', 'portability'],
    vehicle: 'compact',
    season: 'spring-autumn',
  },

  family: {
    adults: 2,
    children: 2,
    experience: 'some',
    setupPeople: 2,
    maxBudget: 150000,
    priorities: ['space', 'durability'],
    vehicle: 'minivan',
    season: 'spring-autumn',
  },

  beginner: {
    adults: 2,
    children: 0,
    experience: 'first',
    setupPeople: 2,
    maxBudget: 80000,
    priorities: ['setup', 'price'],
    vehicle: 'compact',
    season: 'spring-autumn',
  },
};

function formatPrice(price: number | null | undefined) {
  if (!price) return null;
  return `${price.toLocaleString('ja-JP')}円`;
}

export default function TentGuide() {
  const { guideType } = useParams<{ guideType: string }>();
  const guideKey = guideType as GuideType;
  const guide = guides[guideKey];

  usePageMeta(guide?.metaTitle, guide?.description);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const tentCategory = categories.find(
    (item) =>
      item.name === 'テント' ||
      item.slug.toLowerCase().includes('tent'),
  );

  const {
    data: diagnosisData,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: ['tent-guide-recommendations', guideKey, tentCategory?.id],
    queryFn: () =>
      api.diagnosis.tents({
        ...diagnosisPresets[guideKey],
        categoryId: tentCategory!.id,
      }),
    enabled: !!guide && !!tentCategory,
    staleTime: 1000 * 60 * 30,
  });

  const recommendedProducts = diagnosisData?.results.slice(0, 5) ?? [];

  if (!guide) {
    return (
      <main className="min-h-screen bg-[#edf1ed] flex items-center justify-center">
        <div className="text-center">
          <p className="font-bold">ページが見つかりません</p>
          <Link href="/explore" className="mt-4 inline-block text-[#315c4c] underline">
            商品を探す
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[720px] bg-[#f8faf8] px-5 pb-24 pt-8">
        <Link href="/explore/tent" className="text-sm font-bold text-[#315c4c]">
          ← テント比較に戻る
        </Link>

        <header className="mt-8">
          <p className="text-sm font-bold text-[#315c4c]">{guide.label}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">{guide.title}</h1>
          <p className="mt-5 leading-8 text-[#68746e]">{guide.intro}</p>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-black">テント選びで確認したいポイント</h2>

          <div className="mt-5 grid gap-4">
            {guide.points.map((point) => (
              <article
                key={point.title}
                className="rounded-2xl border border-[#dce5df] bg-white p-5"
              >
                <h3 className="font-bold text-[#284b3f]">{point.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#68746e]">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#315c4c]">
                CRITIQ診断データから選定
              </p>
              <h2 className="mt-1 text-xl font-black">
                {guide.label}におすすめのテント5選
              </h2>
            </div>
          </div>

          <p className="mt-3 text-sm leading-7 text-[#68746e]">
            CRITIQに登録されているテントを、用途・人数・設営条件などから分析し、相性が高い順に表示しています。
          </p>

          <div className="mt-5 space-y-4">
            {productsLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 animate-pulse rounded-3xl bg-slate-200"
                />
              ))
            ) : productsError ? (
              <div className="rounded-3xl border border-[#dce5df] bg-white p-6 text-sm text-[#68746e]">
                おすすめ商品を取得できませんでした。テント診断から条件を指定して探すことができます。
              </div>
            ) : recommendedProducts.length > 0 ? (
              recommendedProducts.map((item, index) => {
                const product = item.product;
                const image = product.images?.[0];

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-3xl border border-[#dce5df] bg-white"
                  >
                    {image && (
                      <img
                        src={image}
                        alt={`${product.brand} ${product.name}`}
                        className="h-48 w-full object-cover"
                        loading="lazy"
                      />
                    )}

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[#315c4c]">
                            おすすめ {index + 1}
                          </p>
                          <h3 className="mt-1 text-lg font-black">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-sm text-[#68746e]">
                            {product.brand}
                            {product.modelNumber
                              ? `・${product.modelNumber}`
                              : ''}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-[#e8f0eb] px-3 py-2 text-center">
                          <p className="text-[10px] font-bold text-[#68746e]">
                            相性
                          </p>
                          <p className="text-lg font-black text-[#315c4c]">
                            {item.percentage}%
                          </p>
                        </div>
                      </div>

                      {formatPrice(product.price) && (
                        <p className="mt-3 font-bold">
                          参考価格 {formatPrice(product.price)}
                        </p>
                      )}

                      {item.reasons.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-bold text-[#315c4c]">
                            おすすめ理由
                          </p>
                          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#68746e]">
                            {item.reasons.slice(0, 2).map((reason) => (
                              <li key={reason}>・{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Link
                        href={`/product/${product.id}`}
                        className="mt-5 flex w-full items-center justify-center rounded-2xl border border-[#315c4c] px-4 py-3 text-sm font-bold text-[#315c4c]"
                      >
                        詳しく商品評価を見る →
                      </Link>

                      {product.amazonAffiliateUrl && (
                        <a
                          href={product.amazonAffiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="mt-3 flex w-full items-center justify-center rounded-2xl bg-[#ff9900] px-4 py-3 text-sm font-black text-white"
                        >
                          Amazonで商品を見る →
                        </a>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl border border-[#dce5df] bg-white p-6 text-sm text-[#68746e]">
                条件に合う商品を準備中です。
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 rounded-3xl bg-[#e8f0eb] p-6">
          <p className="text-sm font-bold text-[#315c4c]">CRITIQ テント診断</p>
          <h2 className="mt-2 text-xl font-black">
            条件から自分に合うテントを探す
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#68746e]">
            キャンプ経験、人数、移動手段、季節などを選ぶと、条件に合うテントを絞り込めます。
          </p>

          <Link
            href="/diagnosis/tents"
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#ff8a00] px-5 py-4 font-black text-white"
          >
            15秒でテント診断をする →
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-black">目的別にテントを探す</h2>

          <div className="mt-4 grid gap-3">
            {guideType !== 'solo' && (
              <Link
                href="/tents/solo"
                className="rounded-2xl border border-[#dce5df] bg-white p-4 font-bold"
              >
                ソロテントおすすめ・比較 →
              </Link>
            )}

            {guideType !== 'family' && (
              <Link
                href="/tents/family"
                className="rounded-2xl border border-[#dce5df] bg-white p-4 font-bold"
              >
                ファミリーテントおすすめ・比較 →
              </Link>
            )}

            {guideType !== 'beginner' && (
              <Link
                href="/tents/beginner"
                className="rounded-2xl border border-[#dce5df] bg-white p-4 font-bold"
              >
                初心者向けテントおすすめ・比較 →
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
