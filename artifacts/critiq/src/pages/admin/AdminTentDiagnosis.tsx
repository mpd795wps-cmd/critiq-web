import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';

type Entry = { productId: number; specs: Record<string, unknown>; diagnosis: Record<string, unknown> };

export default function AdminTentDiagnosis() {
  const { data: products = [] } = useQuery({ queryKey: ['admin-products'], queryFn: () => api.admin.products.list() });
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(input) as unknown;
      const entries = Array.isArray(value) ? value : (value as { entries?: unknown })?.entries;
      if (!Array.isArray(entries)) return { entries: [] as Entry[], error: input ? 'JSON配列、または entries 配列が必要です' : '' };
      return { entries: entries as Entry[], error: '' };
    } catch { return { entries: [] as Entry[], error: input ? 'JSONの形式が正しくありません' : '' }; }
  }, [input]);

  async function save() {
    if (!parsed.entries.length || parsed.error) return;
    setSaving(true); setMessage('');
    try {
      const result = await api.admin.products.saveTentDiagnosisBulk(parsed.entries);
      setMessage(`✓ ${result.saved}件のスペック・診断表を保存しました`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存に失敗しました'); }
    finally { setSaving(false); }
  }

  const productReference = products.map((product) => `${product.id}\t${product.brand}\t${product.name}\t${product.modelNumber}`).join('\n');
  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-[#1f2a25]">⛺ テント診断データ一括登録</h1>
        <p className="mt-2 text-sm leading-6 text-[#68746e]">ChatGPTで作成した公式スペックと診断表をJSONで貼り付け、下書きまたは公開状態で一括保存します。</p>
        <section className="mt-6 rounded-2xl border border-[#dce5df] bg-white p-6">
          <details>
            <summary className="cursor-pointer font-bold">商品ID一覧を表示</summary>
            <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-slate-50 p-4 text-xs">{productReference || '商品がありません'}</pre>
          </details>
          <label className="mt-6 block text-sm font-bold">スペック・診断JSON</label>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={20} spellCheck={false}
            placeholder={'[\n  {\n    "productId": 123,\n    "specs": { "officialUrl": "...", "manufacturerCapacity": 5, "weightKg": 11 },\n    "diagnosis": { "comfortableAdultsMin": 3, "comfortableAdultsMax": 4, "beginnerScore": 4, "recommendedFor": ["4人家族向け"], "cautions": ["一人設営は負担"], "confidence": "high", "status": "published" }\n  }\n]'}
            className="mt-2 w-full rounded-xl border border-[#dce5df] p-4 font-mono text-xs" />
          <div className="mt-3 flex items-center justify-between text-sm"><span className={parsed.error ? 'text-red-600' : 'text-[#68746e]'}>{parsed.error || `${parsed.entries.length}件を認識`}</span><button onClick={save} disabled={saving || !parsed.entries.length || !!parsed.error} className="rounded-xl bg-[#315c4c] px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? '保存中…' : '一括保存'}</button></div>
          {message && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm font-bold">{message}</p>}
        </section>
      </div>
    </AdminLayout>
  );
}
