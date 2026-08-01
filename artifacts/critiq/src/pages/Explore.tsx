import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { GlassWater } from 'lucide-react';
import { api } from '@/lib/api';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function Explore() {
  usePageMeta(
    'アウトドア用品をカテゴリから探す｜CRITIQ',
    'テント・チェア・ライト・クーラーボックスなどのアウトドア用品を、あなたの基準で比較・検索。CRITIQでカテゴリから探してみよう。',
  );
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] px-5 pb-24 pt-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex text-sm font-bold text-[#315c4c]">
            ← ホーム
          </Link>
          <Link
            href="/grow"
            className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
          >
            育てる →
          </Link>
        </div>

        <header className="mt-7">
          <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
          <h1 className="mt-2 text-3xl font-bold">カテゴリを選ぶ</h1>
          <p className="mt-3 leading-7 text-[#68746e]">
            比較したいアウトドア用品のカテゴリを選択してください。
          </p>
        </header>

        <section className="mt-8">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-[1.5rem] bg-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => {
                const categorySlug = (category.slug ?? '').toLowerCase();
                const isMousewash =
                  ['mousewash', 'mouse-wash', 'mouse_wash'].includes(categorySlug) ||
                  category.name === 'マウスウォッシュ';

                return (
                  <Link
                    key={category.id}
                    href={`/explore/${category.slug}`}
                    className="flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-[#dce5df] bg-white p-5 text-center transition hover:border-[#9fbdad] hover:bg-[#f1f6f3] active:scale-[0.98]"
                  >
                    {isMousewash ? (
                      <GlassWater className="size-8 text-[#315c4c]" aria-hidden="true" />
                    ) : (
                      <span className="text-3xl" aria-hidden="true">{category.icon}</span>
                    )}
                    <span className="text-sm font-bold">{category.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
