import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { api } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

const inputClass = 'w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm outline-none focus:border-[#315c4c] transition';

export default function Login() {
  const [, navigate] = useLocation();
  const { setUser } = useUser();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.auth.login({ email: email.trim() });
      setUser(data.user);
      navigate('/grow');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf1ed] flex items-center justify-center px-5">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-[#dce5df] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-[#315c4c]">CRITIQ</p>
          <h1 className="mt-3 text-2xl font-black text-[#1f2a25]">ログイン</h1>
          <p className="mt-1 text-sm text-[#68746e]">
            登録済みのメールアドレスを入力するだけでログインできます。
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#1f2a25] mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#315c4c] py-3 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-60"
            >
              {submitting ? 'ログイン中…' : 'ログイン'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#68746e]">
            アカウントをお持ちでない方は{' '}
            <Link href="/register" className="font-bold text-[#315c4c] underline">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
