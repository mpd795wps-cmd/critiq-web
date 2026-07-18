import { Link } from 'wouter';
import BottomNavigation from '@/components/BottomNavigation';

export default function Grow() {
  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] px-5 pb-28 pt-8">
        <Link href="/" className="inline-flex text-sm font-bold text-[#315c4c]">
          ← ホーム
        </Link>

        <h1 className="mt-8 text-3xl font-bold">育てる</h1>

        <p className="mt-3 leading-7 text-[#68746e]">
          あなたの基準や評価を、次に商品を選ぶ人へ届けます。
        </p>

        <section className="mt-8 space-y-3">
          <Link
            href="/grow/rating"
            className="block rounded-[1.5rem] border border-[#dce5df] bg-white p-5 shadow-sm"
          >
            <h2 className="font-bold text-[#284b3f]">商品を評価する</h2>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">
              持っている商品を検索して、基準ごとに評価します。
            </p>
          </Link>

          <Link
            href="/grow/product"
            className="block rounded-[1.5rem] border border-[#dce5df] bg-white p-5 shadow-sm"
          >
            <h2 className="font-bold text-[#284b3f]">商品を登録する</h2>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">
              まだ登録されていない商品を追加します。
            </p>
          </Link>

          <Link
            href="/grow/criterion"
            className="block rounded-[1.5rem] border border-[#dce5df] bg-white p-5 shadow-sm"
          >
            <h2 className="font-bold text-[#284b3f]">基準を追加する</h2>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">
              既存の基準にはない、新しい比較基準を提案します。
            </p>
          </Link>
        </section>

        <BottomNavigation />
      </div>
    </main>
  );
}
