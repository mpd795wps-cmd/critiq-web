import { Link, useParams } from 'wouter';
import { categories } from '@/data/categories';
import { getAllCriteriaForCategory } from '@/data/criteria';
import CriteriaSelector from '@/components/CriteriaSelector';

export default function Category() {
  const { categoryId } = useParams<{ categoryId: string }>();

  const category = categories.find((item) => item.id === categoryId);
  const criteria = getAllCriteriaForCategory(categoryId ?? '');

  if (!category) {
    return (
      <main className="min-h-screen bg-[#edf1ed] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-[#315c4c]">カテゴリが見つかりません</p>
          <Link href="/explore" className="mt-4 inline-block text-sm text-[#315c4c] underline">
            カテゴリ一覧に戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] px-5 pb-24 pt-8">
        <div className="flex items-center justify-between">
          <Link href="/explore" className="inline-flex text-sm font-bold text-[#315c4c]">
            ← カテゴリ一覧
          </Link>
          <Link
            href="/grow"
            className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
          >
            育てる →
          </Link>
        </div>

        <header className="mt-7">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">
              {category.icon}
            </span>
            <div>
              <p className="text-sm font-bold text-[#315c4c]">アウトドア用品</p>
              <h1 className="mt-1 text-3xl font-bold">{category.name}</h1>
            </div>
          </div>
          <p className="mt-5 leading-7 text-[#68746e]">
            あなたが商品選びで重視する基準を選択してください。
          </p>
        </header>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-bold">あなたが重視する基準</h2>
            {criteria.length > 0 && (
              <span className="text-xs text-[#68746e]">複数選択できます</span>
            )}
          </div>

          {criteria.length > 0 ? (
            <CriteriaSelector categoryId={categoryId ?? ''} criteria={criteria} />
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#dce5df] bg-white p-6 text-center">
              <p className="font-bold text-[#284b3f]">基準を準備中です</p>
              <p className="mt-2 text-sm leading-6 text-[#68746e]">
                このカテゴリの基準は、今後追加します。
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
