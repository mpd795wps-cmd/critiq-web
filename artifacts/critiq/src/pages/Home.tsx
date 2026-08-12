import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  GlassWater,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function Home() {
  usePageMeta(
    'CRITIQ（クリティーク）｜あなたの基準で商品を探せる比較・口コミサービス',
    'CRITIQ（クリティーク）は、みんなの評価や基準を参考に、自分が大切にしたい条件から商品を比較・検索できるサービスです。',
  );

  const {
    data: categories = [],
    isLoading,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-20">
        <header className="px-5 pb-5 pt-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black tracking-[0.12em] text-[#315c4c]">
                CRITIQ
              </p>
              <p className="mt-0.5 text-xs font-semibold tracking-wide text-[#7a8981]">
                クリティーク
              </p>
            </div>

            <Link
              href="/grow/product"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#cbd8d0] bg-white px-3 py-2 text-xs font-bold text-[#315c4c] shadow-sm transition hover:border-[#315c4c] hover:bg-[#f1f6f3]"
            >
              <Plus className="size-3.5" />
              商品を追加
            </Link>
          </div>

          <div className="mt-7">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e5efe9] px-3 py-1.5 text-xs font-bold text-[#315c4c]">
              <Search className="size-3.5" />
              自分に合う商品を探す
            </div>

            <h1 className="mt-4 text-[32px] font-black leading-[1.35] tracking-tight">
              あなたの基準で、
              <br />
              商品を選ぼう。
            </h1>

            <p className="mt-4 text-sm leading-7 text-[#68746e]">
              人気順や総合点だけではなく、
              <br />
              あなたが大切にしたい基準から比較できます。
            </p>
          </div>
        </header>

        <section className="px-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-wide text-[#315c4c]">
                CATEGORY
              </p>
              <h2 className="mt-1 text-2xl font-black">
                何を探しますか？
              </h2>
            </div>

            <Link
              href="/explore"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#68746e]"
            >
              すべて見る
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-5">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-36 animate-pulse rounded-[24px] bg-slate-200"
                  />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#cbd8d0] bg-white px-5 py-10 text-center">
                <p className="text-sm font-bold text-[#315c4c]">
                  カテゴリを準備中です
                </p>
                <p className="mt-2 text-xs leading-5 text-[#7a8981]">
                  商品カテゴリが追加されると、ここから探せるようになります。
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category, index) => {
                  const slug = (category.slug ?? '').toLowerCase();

                  const isMouthwash =
                    [
                      'mouthwash',
                      'mouth-wash',
                      'mouth_wash',
                      'mousewash',
                      'mouse-wash',
                      'mouse_wash',
                    ].includes(slug) ||
                    category.name === 'マウスウォッシュ';

                  return (
                    <Link
                      key={category.id}
                      href={`/explore/${category.slug}`}
                      className="group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[24px] border border-[#dce5df] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#9fbdad] hover:shadow-md active:scale-[0.98]"
                    >
                      <div
                        className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#edf4ef] transition group-hover:scale-125"
                        aria-hidden="true"
                      />

                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4ef] text-[#315c4c]">
                          {isMouthwash ? (
                            <GlassWater
                              className="size-7"
                              aria-hidden="true"
                            />
                          ) : (
                            <span
                              className="text-3xl"
                              aria-hidden="true"
                            >
                              {category.icon || '○'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="relative mt-5 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#92a097]">
                            Category {index + 1}
                          </p>
                          <p className="mt-1 text-lg font-black leading-tight">
                            {category.name}
                          </p>
                        </div>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#315c4c] text-white transition group-hover:translate-x-1">
                          <ArrowRight className="size-4" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/grow/product"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#b9c9c0] bg-[#f2f6f3] px-4 py-3 text-sm font-bold text-[#315c4c] transition hover:border-[#315c4c] hover:bg-[#eaf2ed]"
          >
            <Plus className="size-4" />
            探したい商品がない場合は、商品を追加する
          </Link>
        </section>

        <section className="mt-10 px-5">
          <div className="rounded-[28px] bg-[#274b3e] p-6 text-white shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="size-5" />
            </div>

            <p className="mt-5 text-xs font-bold tracking-[0.14em] text-[#cddcd3]">
              ABOUT CRITIQ
            </p>

            <h2 className="mt-2 text-2xl font-black leading-snug">
              正解は、
              <br />
              一つじゃない。
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#dce8e1]">
              CRITIQ（クリティーク）は、
              「総合評価が高い商品」だけでなく、
              あなたが重視する基準から商品を探せるサービスです。
            </p>

            <p className="mt-5 text-sm leading-7 text-[#dce8e1]">
              みんなの評価や基準が、
              次に商品を選ぶ人の参考になります。
            </p>

            <Link
              href="/grow/rating"
              className="mt-6 flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#274b3e] shadow-sm transition hover:bg-[#f1f6f3] active:scale-[0.98]"
            >
              <span>使った商品を評価する</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <footer className="mt-10 px-5 text-center">
          <p className="text-xs leading-6 text-[#98a39d]">
            CRITIQ（クリティーク）
            <br />
            あなたが大切にする基準が、
            誰かの商品選びを助けます。
          </p>
        </footer>
      </div>
    </main>
  );
}
