import { Link, useParams } from 'wouter';
import { usePageMeta } from '@/hooks/usePageMeta';

type GuideType = 'solo' | 'family' | 'beginner';

const guides: Record<
  GuideType,
  {
    label: string;
    title: string;
    metaTitle: string;
    description: string;
    intro: string;
    points: { title: string; body: string }[];
  }
> = {
  solo: {
    label: 'ソロキャンプ',
    title: 'ソロテントおすすめ・比較',
    metaTitle: 'ソロテントおすすめ・比較｜自分に合うテントを探す｜CRITIQ',
    description:
      'ソロキャンプ向けテントを比較。設営しやすさ、軽さ、耐水性、居住性などの基準から、自分の使い方に合うソロテントを探せます。',
    intro:
      'ソロテントは、軽さだけでなく設営のしやすさや荷物を置ける広さ、雨への強さなども重要です。CRITIQでは、自分が重視する基準からテントを比較できます。',
    points: [
      {
        title: '設営しやすさ',
        body: '一人でも無理なく設営・撤収できるかを確認しましょう。',
      },
      {
        title: '持ち運びやすさ',
        body: 'バイクやコンパクトカーなら、収納サイズや重量も重要です。',
      },
      {
        title: '居住性',
        body: '就寝スペースだけでなく、荷物を置く余裕があるかも確認しましょう。',
      },
    ],
  },

  family: {
    label: 'ファミリーキャンプ',
    title: 'ファミリーテントおすすめ・比較',
    metaTitle:
      'ファミリーテントおすすめ・比較｜家族向けキャンプテントを探す｜CRITIQ',
    description:
      '家族向けキャンプテントを比較。居住性、耐水性、耐久性、設営しやすさなどから、ファミリーキャンプに合うテントを探せます。',
    intro:
      'ファミリーテントは人数だけで選ぶのではなく、居住性や設営の負担、雨の日の過ごしやすさまで考えることが大切です。',
    points: [
      {
        title: '人数と居住性',
        body: 'メーカー表記の定員だけでなく、実際にゆったり過ごせる広さを考えましょう。',
      },
      {
        title: '設営しやすさ',
        body: '大型テントほど設営負担が増えるため、必要人数や構造も確認しましょう。',
      },
      {
        title: '耐水性・耐久性',
        body: '長く使うなら、雨や風への強さも比較したいポイントです。',
      },
    ],
  },

  beginner: {
    label: 'キャンプ初心者',
    title: '初心者向けテントおすすめ・比較',
    metaTitle:
      '初心者向けテントおすすめ・比較｜初めてのキャンプテント選び｜CRITIQ',
    description:
      'キャンプ初心者向けのテント選びをサポート。設営しやすさ、耐水性、居住性などを比較しながら、自分に合うテントを探せます。',
    intro:
      '初めてのテント選びでは、価格やデザインだけでなく、設営の簡単さや使う人数、キャンプスタイルとの相性を考えることが重要です。',
    points: [
      {
        title: '設営の簡単さ',
        body: '初めてでも扱いやすい構造かどうかを重視すると失敗を減らせます。',
      },
      {
        title: '使用人数',
        body: '人数ぴったりではなく、少し余裕のあるサイズも候補に入れてみましょう。',
      },
      {
        title: '使う季節・天候',
        body: '春夏中心なのか、雨や寒い時期にも使うのかで必要な性能が変わります。',
      },
    ],
  },
};

export default function TentGuide() {
  const { guideType } = useParams<{ guideType: string }>();
  const guide = guides[guideType as GuideType];

  usePageMeta(guide?.metaTitle, guide?.description);

  if (!guide) {
    return (
      <main className="min-h-screen bg-[#edf1ed] flex items-center justify-center">
        <div className="text-center">
          <p className="font-bold">ページが見つかりません</p>
          <Link href="/explore" className="mt-4 inline-block text-[#315c4c] underline">
            商品を探す
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[720px] bg-[#f8faf8] px-5 pb-24 pt-8">
        <Link href="/explore/tent" className="text-sm font-bold text-[#315c4c]">
          ← テント比較に戻る
        </Link>

        <header className="mt-8">
          <p className="text-sm font-bold text-[#315c4c]">{guide.label}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">{guide.title}</h1>
          <p className="mt-5 leading-8 text-[#68746e]">{guide.intro}</p>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-black">テント選びで確認したいポイント</h2>

          <div className="mt-5 grid gap-4">
            {guide.points.map((point) => (
              <article
                key={point.title}
                className="rounded-2xl border border-[#dce5df] bg-white p-5"
              >
                <h3 className="font-bold text-[#284b3f]">{point.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#68746e]">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl bg-[#e8f0eb] p-6">
          <p className="text-sm font-bold text-[#315c4c]">CRITIQ テント診断</p>
          <h2 className="mt-2 text-xl font-black">
            条件から自分に合うテントを探す
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#68746e]">
            キャンプ経験、人数、移動手段、季節などを選ぶと、条件に合うテントを絞り込めます。
          </p>

          <Link
            href="/diagnosis/tents"
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#ff8a00] px-5 py-4 font-black text-white"
          >
            15秒でテント診断をする →
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-black">目的別にテントを探す</h2>

          <div className="mt-4 grid gap-3">
            {guideType !== 'solo' && (
              <Link
                href="/tents/solo"
                className="rounded-2xl border border-[#dce5df] bg-white p-4 font-bold"
              >
                ソロテントおすすめ・比較 →
              </Link>
            )}

            {guideType !== 'family' && (
              <Link
                href="/tents/family"
                className="rounded-2xl border border-[#dce5df] bg-white p-4 font-bold"
              >
                ファミリーテントおすすめ・比較 →
              </Link>
            )}

            {guideType !== 'beginner' && (
              <Link
                href="/tents/beginner"
                className="rounded-2xl border border-[#dce5df] bg-white p-4 font-bold"
              >
                初心者向けテントおすすめ・比較 →
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
