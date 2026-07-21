import { useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.admin.login(password);
      navigate('/admin');
    } catch {
      setError('パスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf1ed]">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#dce5df] bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-[#1f2a25]">CRITIQ 管理画面</h1>
          <p className="mt-1 text-sm text-[#68746e]">管理者パスワードを入力してください</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#1f2a25]">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="mt-2 w-full rounded-xl border border-[#dce5df] px-4 py-3 text-sm outline-none focus:border-[#315c4c] transition"
              />
            </div>
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-xl bg-[#315c4c] py-3 font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-50"
            >
              {loading ? 'ログイン中…' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
