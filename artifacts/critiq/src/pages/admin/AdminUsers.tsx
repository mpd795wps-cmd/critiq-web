import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';

type AdminUser = { id: number; email: string; username: string | null; createdAt: string };

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.admin.users.list(),
  });

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.username ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  async function handleDelete(u: AdminUser) {
    if (!confirm(`「${u.email}」を削除しますか？この操作は取り消せません。`)) return;
    await api.admin.users.delete(u.id);
    qc.invalidateQueries({ queryKey: ['admin-users'] });
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1f2a25]">会員管理</h1>
        <span className="text-sm text-[#68746e]">{users.length} 名</span>
      </div>

      <div className="mt-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="メールアドレス・ユーザー名で検索"
          className="w-full rounded-xl border border-[#dce5df] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#315c4c]"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#dce5df] bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#68746e]">読み込み中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#68746e]">{search ? '該当する会員がいません' : '会員がいません'}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#dce5df] bg-[#f8faf8]">
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">メールアドレス</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">ユーザー名</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">登録日時</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-b border-[#dce5df] hover:bg-[#f8faf8] ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-[#1f2a25]">{u.email}</td>
                  <td className="px-4 py-3 text-[#68746e]">
                    {u.username ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        @{u.username}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#68746e]">
                    {new Date(u.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(u)}
                      className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
