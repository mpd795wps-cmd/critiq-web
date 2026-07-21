import { Link } from 'wouter';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-[#f8faf8] shadow-xl">
        <header className="px-6 pb-6 pt-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-[0.14em] text-[#315c4c]">CRITIQ</h1>
            <button
              type="button"
              aria-label="メニューを開く"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dce5df] bg-white text-xl shadow-sm"
            >
              ⋯
            </button>
          </div>

          <div className="mt-10">
            <p className="text-3xl font-bold leading-[1.45] tracking-tight">
              あなたの基準や評価が、
              <br />
              誰かの選択を変える。
            </p>
            <p className="mt-4 text-sm leading-7 text-[#68746e]">
              商品を探す人も、評価を届ける人も。
              <br />
              みんなの基準で、より納得できる選択へ。
            </p>
          </div>
        </header>

        <section className="flex-1 space-y-4 px-5 pb-28">
          <Link
            href="/explore"
            className="group block rounded-[24px] border border-[#dce6df] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e5efe9] text-2xl">
                🔍
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-[#274b3e]">探す</h2>
                  <span className="text-2xl text-[#8ba095] transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
                <p className="mt-2 font-medium">自分の基準で商品を探す</p>
                <p className="mt-2 text-sm leading-6 text-[#728078]">
                  商品検索やカテゴリ選択から、重視したい基準に合う商品を比較します。
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/grow"
            className="group block rounded-[24px] border border-[#dce6df] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e5efe9] text-2xl">
                🌱
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-[#274b3e]">育てる</h2>
                  <span className="text-2xl text-[#8ba095] transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
                <p className="mt-2 font-medium">基準や評価をみんなに届ける</p>
                <p className="mt-2 text-sm leading-6 text-[#728078]">
                  持っている商品の評価や、商品の登録、基準の追加に参加します。
                </p>
              </div>
            </div>
          </Link>

          <div className="rounded-2xl border border-dashed border-[#cdd9d1] bg-[#f2f6f3] px-5 py-4">
            <p className="text-sm font-bold text-[#315c4c]">CRITIQとは</p>
            <p className="mt-1 text-sm leading-6 text-[#68746e]">
              商品を検索する際は、自分が重視したい基準から商品を探せます。また、自分が大切にしている独自の基準をユーザー自身が追加でき、その基準がほかのユーザーの商品選びにも役立ちます。
            </p>
          </div>
        </section>

        <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 border-t border-[#dfe6e1] bg-white/95 px-8 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <Link
            href="/explore"
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[#315c4c]"
          >
            <span className="text-xl">🔍</span>
            <span className="text-xs font-bold">探す</span>
          </Link>
          <Link
            href="/grow"
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[#718078]"
          >
            <span className="text-xl">🌱</span>
            <span className="text-xs font-bold">育てる</span>
          </Link>
        </nav>
      </div>
    </main>
  );
}
