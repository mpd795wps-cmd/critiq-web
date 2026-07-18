import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
  matchRate: number;
};

export default function ProductCard({
  product,
  matchRate,
}: ProductCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {product.brand}
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {product.name}
          </h2>

          <p className="mt-3 text-base font-semibold text-slate-700">
            ¥{product.price.toLocaleString()}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-emerald-700">
            一致率
          </p>

          <p className="text-2xl font-bold text-emerald-700">
            {matchRate}%
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
      >
        商品を見る
      </button>
    </article>
  );
}