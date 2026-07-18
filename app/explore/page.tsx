import Link from "next/link";
import { categories } from "../../data/categories";
import BottomNavigation from "../../components/BottomNavigation";

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-28">
        <header className="px-5 pb-6 pt-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-bold text-[#315c4c]"
          >
            ← ホーム
          </Link>

          <h1 className="mt-6 text-3xl font-bold">探す</h1>

          <p className="mt-2 text-sm leading-6 text-[#68746e]">
            あなたが重視する基準に合う商品を見つけましょう。
          </p>
        </header>

        <section className="px-5">
          <label
            htmlFor="product-search"
            className="mb-2 block text-sm font-bold text-[#315c4c]"
          >
            商品検索
          </label>

          <div className="flex items-center rounded-2xl border border-[#dce5df] bg-white px-4 shadow-sm">
            <span aria-hidden="true" className="mr-3 text-lg">
              🔍
            </span>

            <input
              id="product-search"
              type="search"
              placeholder="商品名・メーカー・型番・JANで検索"
              className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-[#9aa49f]"
            />
          </div>
        </section>

        <section className="mt-9 px-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold">アウトドア用品から探す</h2>

            <p className="mt-1 text-sm text-[#7a867f]">
              商品カテゴリを選択してください。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/explore/${category.id}`}
                className="group rounded-2xl border border-[#dce5df] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#aac0b3] hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl" aria-hidden="true">
                    {category.icon}
                  </span>

                  <span className="text-[#a1ada6] transition group-hover:translate-x-0.5">
                    →
                  </span>
                </div>

                <p className="mt-4 font-bold text-[#274b3e]">
                  {category.name}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-5 pb-6 pt-8">
          <Link
            href="/grow/product"
            className="flex w-full items-center justify-center rounded-2xl bg-[#315c4c] px-4 py-4 font-bold text-white shadow-sm transition hover:bg-[#274b3e]"
          >
            ＋ 商品登録
          </Link>
        </section>

        <BottomNavigation />
      </div>
    </main>
  );
}