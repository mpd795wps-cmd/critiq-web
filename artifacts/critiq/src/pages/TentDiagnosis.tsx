import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TentDiagnosisAnswers, TentDiagnosisResult } from '@/types/api';

const initialAnswers: TentDiagnosisAnswers = {
  adults: 2, children: 0, experience: 'first', setupPeople: 2, maxBudget: 100000,
  priorities: [], vehicle: 'minivan', season: 'spring-autumn',
};

const priorityOptions = [
  ['setup', '設営の簡単さ'], ['space', '室内の広さ'], ['rain', '雨への強さ'],
  ['summer', '夏の涼しさ'], ['portability', '持ち運びやすさ'], ['durability', '長く使えること'], ['price', '価格'],
] as const;

const DIAGNOSIS_SESSION_KEY = 'critiq_tent_diagnosis';

function loadDiagnosisSession(): { answers: TentDiagnosisAnswers; results: TentDiagnosisResult[] } | null {
  try {
    const stored = sessionStorage.getItem(DIAGNOSIS_SESSION_KEY);
    return stored ? JSON.parse(stored) as { answers: TentDiagnosisAnswers; results: TentDiagnosisResult[] } : null;
  } catch {
    return null;
  }
}

const experienceLabels = { first: '初めて', some: '数回経験あり', experienced: '慣れている' } as const;
const vehicleLabels = { bike: 'バイク', kei: '軽自動車', compact: 'コンパクトカー', minivan: 'ミニバン・SUV', large: '車載スペースに余裕あり' } as const;
const seasonLabels = { 'spring-autumn': '春・秋中心', summer: '夏中心', winter: '冬も使う', all: '一年中' } as const;

export default function TentDiagnosis() {
  const restored = useMemo(() => loadDiagnosisSession(), []);
  const [answers, setAnswers] = useState(restored?.answers ?? initialAnswers);
  const [results, setResults] = useState<TentDiagnosisResult[] | null>(restored?.results ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const tentCategory = useMemo(() => categories.find((item) => item.name === 'テント' || item.slug.includes('tent')), [categories]);

  const set = <K extends keyof TentDiagnosisAnswers>(key: K, value: TentDiagnosisAnswers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  function togglePriority(value: TentDiagnosisAnswers['priorities'][number]) {
    setAnswers((current) => {
      if (current.priorities.includes(value)) return { ...current, priorities: current.priorities.filter((item) => item !== value) };
      if (current.priorities.length >= 2) return current;
      return { ...current, priorities: [...current.priorities, value] };
    });
  }

  async function diagnose() {
    setLoading(true); setError('');
    try {
      const data = await api.diagnosis.tents({ ...answers, categoryId: tentCategory?.id });
      setResults(data.results);
      sessionStorage.setItem(DIAGNOSIS_SESSION_KEY, JSON.stringify({ answers, results: data.results }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '診断に失敗しました');
    } finally { setLoading(false); }
  }

  if (results) {
    return (
      <main className="min-h-screen bg-[#edf1ed] px-5 py-8 text-[#1f2a25]">
        <div className="mx-auto max-w-[480px]">
          <button onClick={() => setResults(null)} className="text-sm font-bold text-[#315c4c]">← 条件を変更する</button>
          <p className="mt-7 text-sm font-bold text-[#315c4c]">CRITIQ テント診断</p>
          <h1 className="mt-2 text-3xl font-bold">あなたに合うテント{results.length}選</h1>
          <p className="mt-3 text-sm leading-6 text-[#68746e]">条件との相性が高い順に、最大5商品を表示しています。</p>
          <section className="mt-6 rounded-2xl border border-[#dce5df] bg-white p-5">
            <h2 className="text-sm font-bold">今回の検索条件</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#46534d]">
              <span className="rounded-full bg-[#edf1ed] px-3 py-2">大人{answers.adults}人・子ども{answers.children}人</span>
              <span className="rounded-full bg-[#edf1ed] px-3 py-2">経験：{experienceLabels[answers.experience]}</span>
              <span className="rounded-full bg-[#edf1ed] px-3 py-2">設営：{answers.setupPeople === 1 ? '1人' : answers.setupPeople === 2 ? '大人2人' : '3人以上'}</span>
              <span className="rounded-full bg-[#edf1ed] px-3 py-2">予算：{answers.maxBudget ? `${answers.maxBudget.toLocaleString('ja-JP')}円以内` : '性能重視'}</span>
              <span className="rounded-full bg-[#edf1ed] px-3 py-2">移動：{vehicleLabels[answers.vehicle]}</span>
              <span className="rounded-full bg-[#edf1ed] px-3 py-2">季節：{seasonLabels[answers.season]}</span>
              {answers.priorities.map((priority) => (
                <span key={priority} className="rounded-full bg-[#e6f0eb] px-3 py-2 text-[#315c4c]">
                  重視：{priorityOptions.find(([value]) => value === priority)?.[1]}
                </span>
              ))}
            </div>
          </section>
          <div className="mt-7 space-y-5">
            {results.map((item, index) => (
              <article key={item.product.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                {item.product.images[0] && <img src={item.product.images[0]} alt="" className="h-52 w-full object-contain bg-white" />}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><span className="text-sm font-black text-[#315c4c]">{index + 1}位</span><h2 className="mt-1 text-lg font-bold">{item.product.name}</h2><p className="text-sm text-[#68746e]">{item.product.brand}</p></div>
                    <span className="shrink-0 rounded-full bg-[#315c4c] px-3 py-2 text-sm font-black text-white">相性 {item.percentage}%</span>
                  </div>
                  <h3 className="mt-5 text-sm font-bold">合っている理由</h3>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-[#46534d]">{item.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}</ul>
                  {item.cautions.length > 0 && <><h3 className="mt-4 text-sm font-bold">購入前の注意点</h3><ul className="mt-2 space-y-1 text-sm leading-6 text-amber-800">{item.cautions.map((caution) => <li key={caution}>・{caution}</li>)}</ul></>}
                  <div className="mt-5 flex flex-col gap-2">
                    {item.product.amazonAffiliateUrl && (
                      <a href={item.product.amazonAffiliateUrl} target="_blank" rel="noopener noreferrer" className="block w-full rounded-2xl bg-[#FF9900] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#e88a00]">
                        🛒 Amazonで商品を見る
                      </a>
                    )}
                    <Link href={`/product/${item.product.id}?from=diagnosis`} className="block w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50">商品詳細を見る</Link>
                  </div>
                </div>
              </article>
            ))}
            {results.length === 0 && <div className="rounded-3xl bg-white p-7 text-center"><p className="font-bold">条件に十分合う商品がありませんでした</p><p className="mt-2 text-sm text-[#68746e]">予算や人数条件を少し広げてお試しください。</p></div>}
          </div>
        </div>
      </main>
    );
  }

  const selectClass = 'mt-2 w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm';
  return (
    <main className="min-h-screen bg-[#edf1ed] px-5 py-8 text-[#1f2a25]">
      <div className="mx-auto max-w-[480px]">
        <Link href="/explore" className="text-sm font-bold text-[#315c4c]">← 戻る</Link>
        <header className="mt-7"><p className="text-sm font-bold text-[#315c4c]">30秒・登録不要</p><h1 className="mt-2 text-3xl font-bold">あなたに合うテント診断</h1><p className="mt-3 leading-7 text-[#68746e]">条件を選ぶと、相性の高い商品を最大5つに絞ります。</p></header>
        <div className="mt-8 space-y-7 rounded-3xl bg-white p-6">
          <label className="block font-bold">大人の人数<select value={answers.adults} onChange={(e) => set('adults', Number(e.target.value))} className={selectClass}>{[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}人</option>)}</select></label>
          <label className="block font-bold">子どもの人数<select value={answers.children} onChange={(e) => set('children', Number(e.target.value))} className={selectClass}>{[0,1,2,3,4].map((n) => <option key={n} value={n}>{n}人</option>)}</select></label>
          <label className="block font-bold">キャンプ経験<select value={answers.experience} onChange={(e) => set('experience', e.target.value as TentDiagnosisAnswers['experience'])} className={selectClass}><option value="first">初めて</option><option value="some">数回経験あり</option><option value="experienced">慣れている</option></select></label>
          <label className="block font-bold">設営する大人の人数<select value={answers.setupPeople} onChange={(e) => set('setupPeople', Number(e.target.value))} className={selectClass}><option value={1}>基本的に1人</option><option value={2}>大人2人</option><option value={3}>3人以上</option></select></label>
          <label className="block font-bold">予算<select value={answers.maxBudget ?? 0} onChange={(e) => set('maxBudget', Number(e.target.value) || null)} className={selectClass}><option value={30000}>3万円以内</option><option value={70000}>7万円以内</option><option value={150000}>15万円以内</option><option value={250000}>25万円以内</option><option value={0}>価格より性能重視</option></select></label>
          <fieldset><legend className="font-bold">重視すること <span className="text-xs font-normal text-[#68746e]">最大2つ</span></legend><div className="mt-3 grid grid-cols-2 gap-2">{priorityOptions.map(([value, label]) => <button type="button" key={value} onClick={() => togglePriority(value)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${answers.priorities.includes(value) ? 'border-[#315c4c] bg-[#e6f0eb] text-[#315c4c]' : 'border-[#dce5df]'}`}>{label}</button>)}</div></fieldset>
          <label className="block font-bold">移動手段<select value={answers.vehicle} onChange={(e) => set('vehicle', e.target.value as TentDiagnosisAnswers['vehicle'])} className={selectClass}><option value="bike">バイク</option><option value="kei">軽自動車</option><option value="compact">コンパクトカー</option><option value="minivan">ミニバン・SUV</option><option value="large">車載スペースに余裕あり</option></select></label>
          <label className="block font-bold">主に使う季節<select value={answers.season} onChange={(e) => set('season', e.target.value as TentDiagnosisAnswers['season'])} className={selectClass}><option value="spring-autumn">春・秋中心</option><option value="summer">夏中心</option><option value="winter">冬も使う</option><option value="all">一年中</option></select></label>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          <button type="button" disabled={loading} onClick={diagnose} className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white disabled:opacity-50">{loading ? '診断中…' : '診断結果を見る'}</button>
        </div>
      </div>
    </main>
  );
}
