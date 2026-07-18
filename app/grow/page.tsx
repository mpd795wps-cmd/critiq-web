import Link from "next/link";
import BottomNavigation from "../../components/BottomNavigation";

export default function GrowPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-surface px-5 pb-28 pt-8">
        <Link
          href="/"
          className="inline-flex text-sm font-bold text-brand-600"
        >
          ← ホーム
        </Link>

        <h1 className="mt-8 text-3xl font-bold">育てる</h1>

        <p className="mt-3 leading-7 text-muted">
          あなたの基準や評価を、次に商品を選ぶ人へ届けます。
        </p>

        <section className="mt-8 space-y-3">
          <Link
            href="/grow/rating"
            className="block rounded-card border border-border bg-card p-5 shadow-soft"
          >
            <h2 className="font-bold text-brand-700">商品を評価する</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              持っている商品を検索して、基準ごとに評価します。
            </p>
          </Link>

          <Link
            href="/grow/product"
            className="block rounded-card border border-border bg-card p-5 shadow-soft"
          >
            <h2 className="font-bold text-brand-700">商品を登録する</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              まだ登録されていない商品を追加します。
            </p>
          </Link>

          <Link
            href="/grow/criterion"
            className="block rounded-card border border-border bg-card p-5 shadow-soft"
          >
            <h2 className="font-bold text-brand-700">基準を追加する</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              既存の基準にはない、新しい比較基準を提案します。
            </p>
          </Link>
        </section>

        <BottomNavigation />
      </div>
    </main>
  );
}