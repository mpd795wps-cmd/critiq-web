import { Link, useLocation } from 'wouter';
import { Search, Sprout } from 'lucide-react';

const navigationItems = [
  { href: '/explore', label: '探す', icon: Search },
  { href: '/grow', label: '育てる', icon: Sprout },
];

export default function BottomNavigation() {
  const [pathname] = useLocation();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 border-t border-[#dce5df] bg-white/95 px-8 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        if (isActive) return null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[#68746e] transition hover:text-[#315c4c]"
          >
            <Icon aria-hidden="true" size={22} strokeWidth={2} />
            <span className="text-xs font-bold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
