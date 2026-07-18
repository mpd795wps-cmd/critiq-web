import Link from "next/link";
import { notFound } from "next/navigation";
import BottomNavigation from "../../../components/BottomNavigation";
import CriteriaSelector from "../../../components/CriteriaSelector";
import { categories } from "../../../data/categories";
import { criteriaByCategory } from "../../../data/criteria";

type CategoryPageProps = {
  params: Promise<{
    categoryId: string;
  }>;
};

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { categoryId } = await params;

  const category = categories.find((item) => item.id === categoryId);
  const criteria = criteriaByCategory[categoryId];

  if (!category) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-surface px-5 pb-32 pt-8">
        <Link
          href="/explore"
          className="inline-flex text-sm font-bold text-brand-600"
        >
          ← カテゴリ一覧
        </Link>

        <header className="mt-7">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">
              {category.icon}
            </span>

            <div>
              <p className="text-sm font-bold text-brand-600">
                アウトドア用品
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                {category.name}
              </h1>
            </div>
          </div>

          <p className="mt-5 leading-7 text-muted">
            あなたが商品選びで重視する基準を選択してください。
          </p>
        </header>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-bold">
              あなたが重視する基準
            </h2>

            {criteria && (
              <span className="text-xs text-muted">
                複数選択できます
              </span>
            )}
          </div>

          {criteria ? (
            <CriteriaSelector
              categoryId={categoryId}
              criteria={criteria}
            />
          ) : (
            <div className="rounded-card border border-dashed border-border bg-card p-6 text-center">
              <p className="font-bold text-brand-700">
                基準を準備中です
              </p>

              <p className="mt-2 text-sm leading-6 text-muted">
                このカテゴリの基準は、今後追加します。
              </p>
            </div>
          )}
        </section>

        <BottomNavigation />
      </div>
    </main>
  );
}