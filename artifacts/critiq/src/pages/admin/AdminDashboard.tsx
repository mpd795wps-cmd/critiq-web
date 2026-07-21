import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';

function StatCard({ label, value, href, badge }: { label: string; value: number | string; href: string; badge?: number }) {
  return (
    <Link href={href} className="block rounded-2xl border border-[#dce5df] bg-white p-6 transition hover:border-[#315c4c] hover:shadow-sm">
      <p className="text-sm font-medium text-[#68746e]">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-black text-[#1f2a25]">{value}</p>
        {badge !== undefined && badge > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">{badge} 件申請中</span>
        )}
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const { data: products = [] } = useQuery({ queryKey: ['admin-products'], queryFn: () => api.admin.products.list() });
  const { data: criteria = [] } = useQuery({ queryKey: ['admin-criteria'], queryFn: () => api.admin.criteria.list() });
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });
  const { data: criterionSuggestions = [] } = useQuery({ queryKey: ['admin-criterion-suggestions', 'pending'], queryFn: () => api.admin.criterionSuggestions.list('pending') });
  const { data: productSuggestions = [] } = useQuery({ queryKey: ['admin-product-suggestions', 'pending'], queryFn: () => api.admin.productSuggestions.list('pending') });

  const pendingProducts = products.filter((p) => p.status === 'pending').length;
  const activeProducts = products.filter((p) => p.status === 'active').length;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-[#1f2a25]">ダッシュボード</h1>
      <p className="mt-1 text-sm text-[#68746e]">CRITIQ の管理状況の概要です。</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="公開中の商品" value={activeProducts} href="/admin/products" badge={pendingProducts} />
        <StatCard label="基準数" value={criteria.filter((c) => c.status === 'active').length} href="/admin/criteria" />
        <StatCard label="カテゴリ数" value={categories.length} href="/admin/categories" />
        <StatCard label="基準提案（申請中）" value={criterionSuggestions.length} href="/admin/suggestions/criteria" />
        <StatCard label="商品申請（申請中）" value={productSuggestions.length} href="/admin/suggestions/products" />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-[#1f2a25]">クイックリンク</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/admin/products" className="flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-5 py-4 transition hover:border-[#315c4c]">
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-bold text-[#1f2a25]">商品を管理する</p>
              <p className="text-xs text-[#68746e]">商品の追加・編集・削除・承認</p>
            </div>
          </Link>
          <Link href="/admin/criteria" className="flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-5 py-4 transition hover:border-[#315c4c]">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-bold text-[#1f2a25]">基準を管理する</p>
              <p className="text-xs text-[#68746e]">比較基準の追加・編集・削除</p>
            </div>
          </Link>
          <Link href="/admin/suggestions/criteria" className="flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-5 py-4 transition hover:border-[#315c4c]">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-bold text-[#1f2a25]">基準提案を確認する</p>
              <p className="text-xs text-[#68746e]">ユーザーからの基準提案を承認・却下</p>
            </div>
          </Link>
          <Link href="/admin/suggestions/products" className="flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-5 py-4 transition hover:border-[#315c4c]">
            <span className="text-2xl">🆕</span>
            <div>
              <p className="font-bold text-[#1f2a25]">商品申請を確認する</p>
              <p className="text-xs text-[#68746e]">ユーザーからの商品登録申請を承認・却下</p>
            </div>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
