import { Link } from 'wouter';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#edf1ed] flex items-center justify-center">
      <div className="text-center px-6">
        <p className="text-5xl font-black text-[#315c4c]">404</p>
        <p className="mt-4 text-lg font-bold text-[#1f2a25]">ページが見つかりません</p>
        <p className="mt-2 text-sm text-[#68746e]">お探しのページは存在しないか、移動した可能性があります。</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-2xl bg-[#315c4c] px-6 py-3 font-bold text-white transition hover:bg-[#284b3f]"
        >
          ホームへ戻る
        </Link>
      </div>
    </main>
  );
}
