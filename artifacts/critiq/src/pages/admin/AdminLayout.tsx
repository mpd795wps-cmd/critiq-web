import { type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/admin', label: 'ダッシュボード', icon: '📊' },
  { href: '/admin/products', label: '商品管理', icon: '📦' },
  { href: '/admin/criteria', label: '基準管理', icon: '📋' },
  { href: '/admin/categories', label: 'カテゴリ管理', icon: '🗂️' },
  { href: '/admin/suggestions/criteria', label: '基準提案', icon: '💡' },
  { href: '/admin/suggestions/products', label: '商品申請', icon: '🆕' },
  { href: '/admin/suggestions/categories', label: 'カテゴリ提案', icon: '🏷️' },
  { href: '/admin/users', label: '会員管理', icon: '👥' },
];

type Props = { children: ReactNode };

export default function AdminLayout({ children }: Props) {
  const [location, navigate] = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.admin.me().catch(() => navigate('/admin/login')).finally(() => setChecking(false));
  }, [navigate]);

  async function handleLogout() {
    await api.admin.logout().catch(() => {});
    navigate('/admin/login');
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#edf1ed]">
        <div className="animate-pulse text-[#315c4c]">確認中…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#edf1ed]">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col bg-[#1f2a25] text-white md:flex">
        <div className="px-5 pt-6 pb-4 border-b border-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9fbdad]">CRITIQ</p>
          <p className="mt-1 font-bold text-white">管理画面</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/admin'
              ? location === '/admin'
              : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-[#9fbdad] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button onClick={handleLogout} className="w-full rounded-lg py-2 text-sm font-medium text-[#9fbdad] transition hover:bg-white/5 hover:text-white">
            ログアウト
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between bg-[#1f2a25] px-4 md:hidden">
        <span className="font-bold text-white text-sm">CRITIQ 管理</span>
        <button onClick={handleLogout} className="text-xs text-[#9fbdad]">ログアウト</button>
      </div>

      {/* Main */}
      <main className="min-h-screen flex-1 pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
