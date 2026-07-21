import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: '審査中',   color: 'bg-amber-100 text-amber-700' },
  approved: { label: '承認済み', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '見送り',   color: 'bg-red-100 text-red-600' },
};

export default function Grow() {
  const { user, loading, logout } = useUser();

  const { data: submissions } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => api.user.mySubmissions(),
    enabled: !!user,
  });

  const hasCriteria = (submissions?.criterionSuggestions?.length ?? 0) > 0;
  const hasProducts = (submissions?.productSuggestions?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] px-5 pb-16 pt-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex text-sm font-bold text-[#315c4c]">
            ← ホーム
          </Link>
          <div className="flex items-center gap-2">
            {!loading && (
              user ? (
                <>
                  <span className="text-xs text-[#68746e]">{user.username ?? user.email}</span>
                  <button
                    onClick={logout}
                    className="rounded-full border border-[#dce5df] px-3 py-1.5 text-xs font-bold text-[#68746e] transition hover:border-red-300 hover:text-red-500"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <Link href="/login" className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">
                  ログイン
                </Link>
              )
            )}
            <Link
              href="/explore"
              className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
            >
              ← 探す
            </Link>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold">育てる</h1>
        <p className="mt-3 leading-7 text-[#68746e]">あなたの基準や評価を、次に商品を選ぶ人へ届けます。</p>

        {!loading && !user && (
          <div className="mt-5 rounded-2xl border border-[#dce5df] bg-[#f1f6f3] px-5 py-4">
            <p className="text-sm font-bold text-[#315c4c]">ログインすると基準提案時に名前が表示されます</p>
            <div className="mt-3 flex gap-3">
              <Link href="/register" className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f]">
                新規登録
              </Link>
              <Link href="/login" className="rounded-xl border border-[#315c4c] px-4 py-2 text-sm font-bold text-[#315c4c] transition hover:bg-[#e8f0eb]">
                ログイン
              </Link>
            </div>
          </div>
        )}

        {/* Action cards */}
        <section className="mt-8 space-y-3">
          <Link href="/grow/rating" className="block rounded-[1.5rem] border border-[#dce5df] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-[#284b3f]">商品を評価する</h2>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">持っている商品を検索して、基準ごとに評価します。</p>
          </Link>
          <Link href="/grow/product" className="block rounded-[1.5rem] border border-[#dce5df] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-[#284b3f]">商品を登録する</h2>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">まだ登録されていない商品を追加します。</p>
          </Link>
          <Link href="/grow/criterion" className="block rounded-[1.5rem] border border-[#dce5df] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-[#284b3f]">基準を追加する</h2>
            <p className="mt-2 text-sm leading-6 text-[#68746e]">既存の基準にはない、新しい比較基準を提案します。</p>
          </Link>
        </section>

        {/* My submissions — only shown when logged in */}
        {user && (hasCriteria || hasProducts) && (
          <section className="mt-10">
            <h2 className="text-base font-bold text-[#1f2a25]">自分の提案</h2>

            {hasCriteria && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#68746e]">基準の提案</p>
                <div className="space-y-2">
                  {submissions!.criterionSuggestions.map((s) => {
                    const st = STATUS_LABEL[s.status] ?? { label: s.status, color: 'bg-slate-100 text-slate-500' };
                    return (
                      <div key={s.id} className="rounded-2xl border border-[#dce5df] bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#1f2a25]">{s.name}</p>
                            {s.categoryName && (
                              <p className="mt-0.5 text-xs text-[#68746e]">{s.categoryName}</p>
                            )}
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${st.color}`}>{st.label}</span>
                        </div>
                        {s.status === 'approved' && s.helpfulCount != null && (
                          <p className="mt-2 text-xs text-[#315c4c]">
                            👍 参考になった: <span className="font-bold">{s.helpfulCount}</span> 件
                          </p>
                        )}
                        {s.status === 'rejected' && s.adminNotes && (
                          <p className="mt-2 text-xs text-[#68746e]">コメント: {s.adminNotes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hasProducts && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#68746e]">商品の登録申請</p>
                <div className="space-y-2">
                  {submissions!.productSuggestions.map((s) => {
                    const st = STATUS_LABEL[s.status] ?? { label: s.status, color: 'bg-slate-100 text-slate-500' };
                    return (
                      <div key={s.id} className="rounded-2xl border border-[#dce5df] bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#1f2a25]">{s.name}</p>
                            <p className="mt-0.5 text-xs text-[#68746e]">{s.brand}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${st.color}`}>{st.label}</span>
                        </div>
                        {s.status === 'rejected' && s.adminNotes && (
                          <p className="mt-2 text-xs text-[#68746e]">コメント: {s.adminNotes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
