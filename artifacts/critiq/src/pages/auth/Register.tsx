import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { api } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

const inputClass = 'w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm outline-none focus:border-[#315c4c] transition';

export default function Register() {
  const [, navigate] = useLocation();
  const { setUser } = useUser();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.auth.register({ email: email.trim(), username: username.trim() || undefined });
      setUser(data.user);
      navigate('/grow');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf1ed] flex items-center justify-center px-5">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-[#dce5df] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-[#315c4c]">CRITIQ</p>
          <h1 className="mt-3 text-2xl font-black text-[#1f2a25]">アカウント作成</h1>
          <p className="mt-1 text-sm text-[#68746e]">
            メールアドレスで登録できます。パスワード不要です。
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#1f2a25] mb-1.5">
                メールアドレス <span className="text-red-500">*</span>
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
            <div>
              <label className="block text-sm font-bold text-[#1f2a25] mb-1.5">
                ユーザー名 <span className="text-[#9aa49f] font-normal">（任意）</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例：山田太郎"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[#68746e]">基準を提案した際に表示されます。</p>
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
              {submitting ? '登録中…' : 'アカウントを作成'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#68746e]">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="font-bold text-[#315c4c] underline">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
