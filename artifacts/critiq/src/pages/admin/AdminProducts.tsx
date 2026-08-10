import { useState, useRef, useCallback, useEffect, Fragment, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { api } from '@/lib/api';
import type { AdminProductItem } from '@/types/api';

// ─── Ratings panel ─────────────────────────────────────────
function RatingsPanel({ productId, productName }: { productId: number; productName: string }) {
  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['admin-product-ratings', productId],
    queryFn: () => api.admin.products.ratings(productId),
  });

  function stars(score: number) {
    const n = Math.round(score);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  return (
    <tr>
      <td colSpan={6} className="bg-[#f1f6f3] px-6 py-4">
        <p className="mb-3 text-xs font-bold text-[#315c4c]">「{productName}」 — 基準別評価</p>
        {isLoading ? (
          <p className="text-xs text-[#68746e]">読み込み中…</p>
        ) : ratings.length === 0 ? (
          <p className="text-xs text-[#68746e]">まだ評価がありません。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-[#68746e]">
                <th className="pb-2 pr-4">基準名</th>
                <th className="pb-2 pr-4">平均スコア</th>
                <th className="pb-2 pr-4">点数</th>
                <th className="pb-2">件数</th>
              </tr>
            </thead>
            <tbody>
              {ratings.map((r) => (
                <tr key={r.criterionId} className="border-t border-[#dce5df]">
                  <td className="py-1.5 pr-4 font-medium text-[#1f2a25]">{r.criterionName ?? `基準 ${r.criterionId}`}</td>
                  <td className="py-1.5 pr-4 font-mono text-amber-500">{stars(r.score)}</td>
                  <td className="py-1.5 pr-4 font-bold text-[#315c4c]">{Math.round(r.score * 20)}点</td>
                  <td className="py-1.5 text-[#68746e]">{r.count}件</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </td>
    </tr>
  );
}


type AiRatingDraft = {
  criterionId: number;
  criterionName: string;
  score: number;
  reason: string;
};

function AiRatingsModal({
  product,
  onClose,
}: {
  product: AdminProductItem;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { data: criteria = [], isLoading: criteriaLoading } = useQuery({
    queryKey: ['admin-criteria', product.categoryId],
    queryFn: () => api.admin.criteria.list(product.categoryId),
  });

  const {
    data: savedRatings = [],
    isLoading: ratingsLoading,
  } = useQuery({
    queryKey: ['admin-product-ai-ratings', product.id],
    queryFn: () => api.admin.products.aiRatings(product.id),
  });

  const [drafts, setDrafts] = useState<AiRatingDraft[]>([]);
  const [bulkInput, setBulkInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (criteriaLoading || ratingsLoading) return;

    const ratingMap = new Map(
      savedRatings.map((rating) => [rating.criterionId, rating]),
    );

    setDrafts(
      criteria.map((criterion) => {
        const saved = ratingMap.get(criterion.id);

        return {
          criterionId: criterion.id,
          criterionName: criterion.name,
          score: saved ? Number(saved.score) : 3,
          reason: saved?.reason ?? '',
        };
      }),
    );
  }, [criteria, savedRatings, criteriaLoading, ratingsLoading]);

  const isPublished = savedRatings.some((rating) => rating.published);

  function updateDraft(
    criterionId: number,
    field: 'score' | 'reason',
    value: number | string,
  ) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.criterionId === criterionId
          ? { ...draft, [field]: value }
          : draft,
      ),
    );
  }

  function applyBulkInput() {
    const lines = bulkInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setMessage('貼り付けるAI評価を入力してください');
      return;
    }

    const nextDrafts = drafts.map((draft) => ({ ...draft }));

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      const target = nextDrafts.find(
        (draft) =>
          line.includes(draft.criterionName) ||
          draft.criterionName.includes(line),
      );

      if (!target) continue;

      const scoreMatch =
        line.match(/([1-5](?:\.5)?)\s*(?:\/\s*5)?/) ??
        lines[index + 1]?.match(/([1-5](?:\.5)?)\s*(?:\/\s*5)?/);

      if (scoreMatch) {
        target.score = Number(scoreMatch[1]);
      }

      const reasonLines: string[] = [];

      for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
        const nextLine = lines[nextIndex];

        const startsAnotherCriterion = nextDrafts.some(
          (draft) =>
            nextLine.includes(draft.criterionName) ||
            draft.criterionName.includes(nextLine),
        );

        if (startsAnotherCriterion) break;

        if (
          !/^理由[:：]?$/.test(nextLine) &&
          !/^星評価[:：]?$/.test(nextLine) &&
          !/^評価[:：]?$/.test(nextLine) &&
          !/^[★☆]+$/.test(nextLine) &&
          !/^([1-5](?:\.5)?)\s*(?:\/\s*5)?$/.test(nextLine)
        ) {
          reasonLines.push(
            nextLine.replace(/^理由[:：]\s*/, ''),
          );
        }
      }

      if (reasonLines.length > 0) {
        target.reason = reasonLines.join(' ');
      }
    }

    setDrafts(nextDrafts);
    setMessage('✓ 貼り付け内容を入力欄へ反映しました');
  }

  async function handleSave() {
    const invalid = drafts.find((draft) => !draft.reason.trim());

    if (invalid) {
      setMessage(`「${invalid.criterionName}」の評価理由を入力してください`);
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await api.admin.products.saveAiRatings(
        product.id,
        drafts.map((draft) => ({
          criterionId: draft.criterionId,
          score: draft.score,
          reason: draft.reason.trim(),
        })),
      );

      await qc.invalidateQueries({
        queryKey: ['admin-product-ai-ratings', product.id],
      });

      setMessage('✓ AI評価を下書き保存しました');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'AI評価の保存に失敗しました',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setMessage('');

    try {
      await api.admin.products.publishAiRatings(product.id);

      await qc.invalidateQueries({
        queryKey: ['admin-product-ai-ratings', product.id],
      });

      setMessage('✓ AI評価を公開しました');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'AI評価の公開に失敗しました',
      );
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    setPublishing(true);
    setMessage('');

    try {
      await api.admin.products.unpublishAiRatings(product.id);

      await qc.invalidateQueries({
        queryKey: ['admin-product-ai-ratings', product.id],
      });

      setMessage('✓ AI評価を非公開にしました');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'AI評価の非公開に失敗しました',
      );
    } finally {
      setPublishing(false);
    }
  }

  const loading = criteriaLoading || ratingsLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce5df] bg-white px-6 py-4">
          <div>
            <h2 className="font-bold text-[#1f2a25]">🤖 AI評価</h2>
            <p className="mt-0.5 text-xs text-[#68746e]">
              {product.brand}・{product.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#68746e] hover:text-[#1f2a25]"
          >
            ×
          </button>
        </div>

        <div className="border-b border-[#dce5df] bg-[#f8faf8] px-6 py-5">
          <p className="text-sm font-bold text-[#315c4c]">
            ChatGPTの評価を一括貼り付け
          </p>
          <p className="mt-1 text-xs text-[#68746e]">
            基準名・星評価・理由をまとめて貼り付けてください。
          </p>

          <textarea
            rows={10}
            value={bulkInput}
            onChange={(event) => {
              setBulkInput(event.target.value);
              setMessage('');
            }}
            placeholder={`例：

口臭除去の効果
4.5
口臭ケアを主目的とした商品で、使用後の爽快感や持続性が評価されているため。

刺激の少なさ
4.0
アルコールフリーで比較的刺激が少ない一方、ミント感には個人差があるため。`}
            className="mt-3 w-full resize-y rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c]"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyBulkInput}
              disabled={loading || drafts.length === 0 || !bulkInput.trim()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              貼り付け内容を反映
            </button>

            <button
              type="button"
              onClick={() => {
                setBulkInput('');
                setMessage('');
              }}
              disabled={!bulkInput}
              className="rounded-xl border border-[#dce5df] bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              貼り付け欄をクリア
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-[#68746e]">
              読み込み中…
            </p>
          ) : drafts.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#68746e]">
              このカテゴリには評価基準がありません。
            </p>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div
                  key={draft.criterionId}
                  className="rounded-xl border border-[#dce5df] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold text-[#1f2a25]">
                      {draft.criterionName}
                    </p>

                    <select
                      value={draft.score}
                      onChange={(event) =>
                        updateDraft(
                          draft.criterionId,
                          'score',
                          Number(event.target.value),
                        )
                      }
                      className="rounded-lg border border-[#dce5df] bg-white px-3 py-2 text-sm font-bold text-[#315c4c] outline-none focus:border-[#315c4c]"
                    >
                      {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(
                        (score) => (
                          <option key={score} value={score}>
                            ★ {score.toFixed(1)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <label className="mt-3 block text-xs font-bold text-[#68746e]">
                    AI評価の理由
                  </label>

                  <textarea
                    rows={3}
                    value={draft.reason}
                    onChange={(event) =>
                      updateDraft(
                        draft.criterionId,
                        'reason',
                        event.target.value,
                      )
                    }
                    placeholder="この評価にした理由を入力してください"
                    className="mt-1 w-full resize-y rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c]"
                  />
                </div>
              ))}
            </div>
          )}

          {message && (
            <p
              className={`mt-4 text-sm ${
                message.startsWith('✓')
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-[#dce5df] bg-white px-6 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || drafts.length === 0}
            className="rounded-xl border border-[#315c4c] px-4 py-2 text-sm font-bold text-[#315c4c] transition hover:bg-[#f1f6f3] disabled:opacity-50"
          >
            {saving ? '保存中…' : '下書き保存'}
          </button>

          {isPublished ? (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={publishing}
              className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-200 disabled:opacity-50"
            >
              {publishing ? '処理中…' : '非公開にする'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || savedRatings.length === 0}
              className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-50"
            >
              {publishing ? '処理中…' : '承認して公開'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = { active: '公開中', pending: '保留中', rejected: '却下' };
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
};

type FormState = {
  categoryId: string;
  brand: string;
  name: string;
  modelNumber: string;
  janCode: string;
  price: string;
  description: string;
  status: string;
  imageUrls: string; // newline-separated
  amazonAffiliateUrl: string;
  asin: string;
};

const EMPTY_FORM: FormState = {
  categoryId: '', brand: '', name: '', modelNumber: '',
  janCode: '', price: '', description: '', status: 'active', imageUrls: '',
  amazonAffiliateUrl: '', asin: '',
};

// ─── JAN lookup result type ────────────────────────────────
type JanResult =
  | { found: true; name: string; brand: string; description: string; images: string[]; lowestPrice: number | null }
  | { found: false; reason?: string };

// ─── Sub-component: ProductForm panel ─────────────────────
function ProductForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  title,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });

  const [janLoading, setJanLoading] = useState(false);
  const [janMsg, setJanMsg] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlMsg, setUrlMsg] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadMsg, setImageUploadMsg] = useState('');
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'janCode') triggerJanLookup(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerJanLookup(code: string) {
    setJanMsg('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!/^\d{8,14}$/.test(code)) return;
    debounceRef.current = setTimeout(async () => {
      setJanLoading(true);
      try {
        const data = await api.jan.lookup(code) as JanResult;
        if (data.found) {
          setForm((prev) => ({
            ...prev,
            name: prev.name || data.name,
            brand: prev.brand || data.brand,
            description: prev.description || data.description,
            price: prev.price || (data.lowestPrice ? String(Math.round(data.lowestPrice)) : ''),
            imageUrls: prev.imageUrls || data.images.join('\n'),
          }));
          setJanMsg('✓ 商品情報を取得しました');
        } else {
          setJanMsg('データベースに見つかりませんでした（国内商品は対応外の場合あり）');
        }
      } catch {
        setJanMsg('取得に失敗しました');
      } finally {
        setJanLoading(false);
      }
    }, 600);
  }

  async function handleUrlFetch() {
    const url = urlInput.trim();
    if (!url) return;
    setUrlMsg('');
    setUrlFetching(true);
    try {
      const data = await api.products.fetchUrl(url);
      setForm((prev) => ({
        ...prev,
        name: prev.name || data.name || '',
        brand: prev.brand || data.brand || '',
        description: prev.description || data.description || '',
        price: prev.price || (data.price ? String(data.price) : ''),
        imageUrls: prev.imageUrls || (data.images?.join('\n') ?? ''),
      }));
      setUrlMsg('✓ 情報を取得しました');
      setUrlInput('');
    } catch (e) {
      setUrlMsg(e instanceof Error ? e.message : '取得に失敗しました');
    } finally {
      setUrlFetching(false);
    }
  }

  function getImageUrls(): string[] {
    return form.imageUrls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean);
  }

  function removeImage(indexToRemove: number) {
    const nextUrls = getImageUrls().filter(
      (_url, index) => index !== indexToRemove,
    );

    setForm((prev) => ({
      ...prev,
      imageUrls: nextUrls.join('\n'),
    }));
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const invalidFile = files.find(
      (file) => !file.type.startsWith('image/'),
    );

    if (invalidFile) {
      setImageUploadMsg('画像ファイルのみ選択できます');
      event.target.value = '';
      return;
    }

    const tooLargeFile = files.find(
      (file) => file.size > 10 * 1024 * 1024,
    );

    if (tooLargeFile) {
      setImageUploadMsg('1枚あたり10MB以下の画像を選択してください');
      event.target.value = '';
      return;
    }

    setImageUploading(true);
    setImageUploadMsg('');

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const url = await api.upload.image(file);
        uploadedUrls.push(url);
      }

      setForm((prev) => {
        const currentUrls = prev.imageUrls
          .split('\n')
          .map((url) => url.trim())
          .filter(Boolean);

        const nextUrls = [
          ...currentUrls,
          ...uploadedUrls.filter(
            (url) => !currentUrls.includes(url),
          ),
        ];

        return {
          ...prev,
          imageUrls: nextUrls.join('\n'),
        };
      });

      setImageUploadMsg(
        `✓ ${uploadedUrls.length}枚の画像を追加しました`,
      );
    } catch (error) {
      setImageUploadMsg(
        error instanceof Error
          ? error.message
          : '画像のアップロードに失敗しました',
      );
    } finally {
      setImageUploading(false);

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  }

  const inputClass = 'mt-1 w-full rounded-xl border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#315c4c] transition';
  const labelClass = 'block text-xs font-bold text-[#68746e]';

  return (
    <div className="mt-5 rounded-2xl border border-[#315c4c] bg-white">
      <div className="flex items-center justify-between border-b border-[#dce5df] px-6 py-4">
        <h2 className="font-bold text-[#1f2a25]">{title}</h2>
        <button onClick={onCancel} className="text-xl leading-none text-[#68746e] hover:text-[#1f2a25]">×</button>
      </div>
      {/* URL auto-fill */}
      <div className="border-b border-[#dce5df] px-6 py-4 bg-[#f8faf8]">
        <p className="text-xs font-bold text-[#315c4c]">🔗 URLから情報を自動入力</p>
        <p className="mt-0.5 text-xs text-[#68746e]">商品ページのURLを貼ると商品名・説明・画像を自動取得します</p>
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setUrlMsg(''); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlFetch())}
            placeholder="https://..."
            className="min-w-0 flex-1 rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c] transition"
          />
          <button
            type="button"
            onClick={handleUrlFetch}
            disabled={urlFetching || !urlInput.trim()}
            className="shrink-0 rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-50"
          >
            {urlFetching ? '取得中…' : '取得'}
          </button>
        </div>
        {urlMsg && (
          <p className={`mt-1.5 text-xs ${urlMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{urlMsg}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">

        {/* JAN code — full width */}
        <div className="sm:col-span-2">
          <label className={labelClass}>JANコード <span className="font-normal text-slate-400">（入力すると自動取得を試みます）</span></label>
          <div className="relative">
            <input type="text" inputMode="numeric" maxLength={14} value={form.janCode}
              onChange={(e) => set('janCode', e.target.value)}
              placeholder="例: 4901234567890"
              className={inputClass} />
            {janLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse text-xs text-[#315c4c]">取得中…</span>}
          </div>
          {janMsg && (
            <p className={`mt-1 text-xs ${janMsg.startsWith('✓') ? 'text-emerald-600' : 'text-slate-500'}`}>{janMsg}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>カテゴリ *</label>
          <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={inputClass}>
            <option value="">選択してください</option>
            {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className={labelClass}>ステータス</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
            <option value="active">公開中</option>
            <option value="pending">保留中</option>
            <option value="rejected">却下</option>
          </select>
        </div>

        {/* Brand */}
        <div>
          <label className={labelClass}>ブランド *</label>
          <input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="例: mont-bell" className={inputClass} />
        </div>

        {/* Price */}
        <div>
          <label className={labelClass}>参考価格（円） *</label>
          <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="例: 34800" className={inputClass} />
        </div>

        {/* Name — full width */}
        <div className="sm:col-span-2">
          <label className={labelClass}>商品名 *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例: ステラリッジ テント 2型" className={inputClass} />
        </div>

        {/* Model number */}
        <div>
          <label className={labelClass}>型番</label>
          <input value={form.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} placeholder="例: 1122363" className={inputClass} />
        </div>

        {/* Description — full width */}
        <div className="sm:col-span-2">
          <label className={labelClass}>商品説明</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3}
            placeholder="商品の特徴や用途を入力" className={`${inputClass} resize-none`} />
        </div>

        {/* Product images — full width */}
        <div className="sm:col-span-2">
          <label className={labelClass}>商品画像</label>

          <div className="mt-2 rounded-2xl border border-dashed border-[#aebdb5] bg-[#f8faf8] p-4">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="rounded-xl bg-[#315c4c] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:cursor-wait disabled:opacity-60"
              >
                {imageUploading
                  ? 'アップロード中…'
                  : '画像を選択'}
              </button>

              <p className="text-xs leading-5 text-[#68746e]">
                JPEG・PNG・WebP・GIF
                <br />
                1枚10MB以下・複数選択可
              </p>
            </div>

            {imageUploadMsg && (
              <p
                className={`mt-3 text-xs ${
                  imageUploadMsg.startsWith('✓')
                    ? 'text-emerald-600'
                    : 'text-red-500'
                }`}
              >
                {imageUploadMsg}
              </p>
            )}
          </div>

          {getImageUrls().length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {getImageUrls().map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative overflow-hidden rounded-xl border border-[#dce5df] bg-white"
                >
                  <img
                    src={url}
                    alt={`商品画像 ${index + 1}`}
                    className="aspect-square w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.opacity = '0.25';
                    }}
                  />

                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-[#315c4c] px-2 py-1 text-[10px] font-bold text-white">
                      メイン画像
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-red-500 shadow transition hover:bg-red-50"
                    aria-label={`商品画像${index + 1}を外す`}
                    title="この商品から画像を外す"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <details className="mt-3 rounded-xl border border-[#dce5df] bg-white px-4 py-3">
            <summary className="cursor-pointer text-xs font-bold text-[#315c4c]">
              画像URLを直接入力する
            </summary>

            <textarea
              value={form.imageUrls}
              onChange={(event) =>
                set('imageUrls', event.target.value)
              }
              rows={4}
              placeholder={
                'https://example.com/img1.jpg\nhttps://example.com/img2.jpg'
              }
              className={`${inputClass} resize-none font-mono text-xs`}
            />

            <p className="mt-1 text-xs text-slate-400">
              1行に1つ入力してください。先頭の画像がメイン画像になります。
            </p>
          </details>
        </div>

        {/* Amazon affiliate URL — full width */}
        <div className="sm:col-span-2 border-t border-[#dce5df] pt-4">
          <p className="mb-3 text-xs font-bold text-[#315c4c]">🛒 Amazonアソシエイト（管理者のみ）</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>AmazonアフィリエイトURL <span className="font-normal text-slate-400">（任意）</span></label>
              <input type="url" value={form.amazonAffiliateUrl}
                onChange={(e) => set('amazonAffiliateUrl', e.target.value)}
                placeholder="https://www.amazon.co.jp/dp/..."
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ASIN <span className="font-normal text-slate-400">（任意・自動で大文字化）</span></label>
              <input type="text" value={form.asin}
                onChange={(e) => set('asin', e.target.value.toUpperCase())}
                placeholder="例: B09XYZ1234"
                maxLength={10}
                className={`${inputClass} font-mono uppercase`} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-t border-[#dce5df] px-6 py-4">
        <button onClick={onSave} disabled={saving || !form.categoryId || !form.brand.trim() || !form.name.trim() || !form.price}
          className="rounded-xl bg-[#315c4c] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#284b3f] disabled:opacity-50">
          {saving ? '保存中…' : '保存する'}
        </button>
        <button onClick={onCancel} className="rounded-xl border border-[#dce5df] px-5 py-2.5 text-sm font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">
          キャンセル
        </button>
      </div>
    </div>
  );
}


type BulkProductDraft = {
  rowNumber: number;
  brand: string;
  name: string;
  price: number;
  modelNumber: string;
  description: string;
};

function parseBulkProducts(input: string): {
  products: BulkProductDraft[];
  errors: string[];
} {
  const products: BulkProductDraft[] = [];
  const errors: string[] = [];
  const duplicateKeys = new Set<string>();

  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const rowNumber = index + 1;
    const delimiter = line.includes('\t') ? '\t' : '|';
    const parts = line.split(delimiter).map((value) => value.trim());

    if (
      rowNumber === 1 &&
      parts.some((value) => value.includes('ブランド')) &&
      parts.some((value) => value.includes('商品名'))
    ) {
      return;
    }

    if (parts.length < 3) {
      errors.push(
        `${rowNumber}行目：ブランド・商品名・参考価格が必要です`,
      );
      return;
    }

    const [brand, name, priceText, modelNumber = '', ...descriptionParts] =
      parts;

    const normalizedPrice = priceText
      .replace(/[¥￥,\s円]/g, '');

    const price = Number(normalizedPrice);

    if (!brand) {
      errors.push(`${rowNumber}行目：ブランドが空です`);
      return;
    }

    if (!name) {
      errors.push(`${rowNumber}行目：商品名が空です`);
      return;
    }

    if (
      !Number.isInteger(price) ||
      price < 0
    ) {
      errors.push(
        `${rowNumber}行目：参考価格「${priceText}」が正しくありません`,
      );
      return;
    }

    const duplicateKey = [
      brand.toLowerCase(),
      name.toLowerCase(),
      modelNumber.toLowerCase(),
    ].join('::');

    if (duplicateKeys.has(duplicateKey)) {
      errors.push(
        `${rowNumber}行目：同じ貼り付け内容内で商品が重複しています`,
      );
      return;
    }

    duplicateKeys.add(duplicateKey);

    products.push({
      rowNumber,
      brand,
      name,
      price,
      modelNumber,
      description: descriptionParts.join(delimiter).trim(),
    });
  });

  return { products, errors };
}

function BulkProductImportModal({
  categories,
  initialCategoryId,
  onClose,
  onCompleted,
}: {
  categories: Array<{ id: number; name: string }>;
  initialCategoryId: string;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}) {
  const [categoryId, setCategoryId] = useState(
    initialCategoryId ||
      (categories[0] ? String(categories[0].id) : ''),
  );

  const [status, setStatus] = useState<
    'active' | 'pending'
  >('active');

  const [bulkInput, setBulkInput] = useState('');
  const [registering, setRegistering] = useState(false);
  const [progress, setProgress] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  const parsed = parseBulkProducts(bulkInput);

  async function handleRegister() {
    if (!categoryId) {
      setResultMessage('カテゴリを選択してください');
      return;
    }

    if (parsed.products.length === 0) {
      setResultMessage('登録できる商品がありません');
      return;
    }

    if (parsed.errors.length > 0) {
      setResultMessage(
        '入力エラーを修正してから登録してください',
      );
      return;
    }

    const confirmed = window.confirm(
      `${parsed.products.length}件の商品を登録しますか？`,
    );

    if (!confirmed) return;

    setRegistering(true);
    setResultMessage('');

    let successCount = 0;
    const failedRows: string[] = [];

    for (let index = 0; index < parsed.products.length; index += 1) {
      const product = parsed.products[index];

      setProgress(
        `${index + 1} / ${parsed.products.length} 件を登録中`,
      );

      try {
        await api.admin.products.create({
          categoryId: Number(categoryId),
          brand: product.brand,
          name: product.name,
          modelNumber: product.modelNumber,
          janCode: undefined,
          price: product.price,
          description: product.description || undefined,
          status,
          images: [],
          amazonAffiliateUrl: null,
          asin: null,
        });

        successCount += 1;
      } catch (error) {
        failedRows.push(
          `${product.rowNumber}行目「${product.name}」：${
            error instanceof Error
              ? error.message
              : '登録に失敗しました'
          }`,
        );
      }
    }

    await onCompleted();

    setRegistering(false);
    setProgress('');

    if (failedRows.length === 0) {
      setResultMessage(
        `✓ ${successCount}件の商品を登録しました`,
      );
      setBulkInput('');
      return;
    }

    setResultMessage(
      `${successCount}件成功、${failedRows.length}件失敗\n${failedRows.join('\n')}`,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce5df] bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#1f2a25]">
              📥 商品を一括登録
            </h2>
            <p className="mt-1 text-xs text-[#68746e]">
              画像は登録後に、各商品の編集画面から追加できます。
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={registering}
            className="text-2xl leading-none text-[#68746e] hover:text-[#1f2a25] disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#1f2a25]">
                登録先カテゴリ
              </span>

              <select
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(event.target.value)
                }
                disabled={registering}
                className="mt-2 w-full rounded-xl border border-[#dce5df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#315c4c]"
              >
                <option value="">カテゴリを選択</option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={String(category.id)}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#1f2a25]">
                ステータス
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as 'active' | 'pending',
                  )
                }
                disabled={registering}
                className="mt-2 w-full rounded-xl border border-[#dce5df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#315c4c]"
              >
                <option value="active">公開中</option>
                <option value="pending">保留中</option>
              </select>
            </label>
          </div>

          <div className="rounded-xl bg-[#f1f6f3] p-4">
            <p className="text-sm font-bold text-[#315c4c]">
              貼り付け形式
            </p>

            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[#52615a]">
{`ブランド|商品名|参考価格|型番|商品説明
DOD|カマボコテント3M|79800|T5-689-TN|5人用のトンネル型テント
DOD|ワンポールテントM|22800|T5-47-TN|設営しやすいワンポールテント`}
            </pre>

            <p className="mt-2 text-xs text-[#68746e]">
              「|」区切りまたはタブ区切りに対応しています。
              型番と商品説明は空欄でも登録できます。
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-[#1f2a25]">
              商品データ
            </span>

            <textarea
              rows={12}
              value={bulkInput}
              onChange={(event) => {
                setBulkInput(event.target.value);
                setResultMessage('');
              }}
              disabled={registering}
              placeholder={`DOD|カマボコテント3M|79800|T5-689-TN|5人用のトンネル型テント
DOD|カマボコテント3L|99800|T7-690-TN|大型のトンネル型テント`}
              className="mt-2 w-full resize-y rounded-xl border border-[#dce5df] px-3 py-3 font-mono text-sm outline-none focus:border-[#315c4c]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              登録可能：{parsed.products.length}件
            </span>

            {parsed.errors.length > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                エラー：{parsed.errors.length}件
              </span>
            )}
          </div>

          {parsed.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">
                入力エラー
              </p>

              <ul className="mt-2 space-y-1 text-xs text-red-600">
                {parsed.errors.map((error) => (
                  <li key={error}>・{error}</li>
                ))}
              </ul>
            </div>
          )}

          {parsed.products.length > 0 && (
            <div>
              <p className="text-sm font-bold text-[#1f2a25]">
                登録内容の確認
              </p>

              <div className="mt-2 overflow-x-auto rounded-xl border border-[#dce5df]">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-[#f8faf8] text-left text-xs text-[#68746e]">
                    <tr>
                      <th className="px-3 py-2">行</th>
                      <th className="px-3 py-2">ブランド</th>
                      <th className="px-3 py-2">商品名</th>
                      <th className="px-3 py-2">参考価格</th>
                      <th className="px-3 py-2">型番</th>
                      <th className="px-3 py-2">商品説明</th>
                    </tr>
                  </thead>

                  <tbody>
                    {parsed.products.slice(0, 100).map((product) => (
                      <tr
                        key={`${product.rowNumber}-${product.name}`}
                        className="border-t border-[#dce5df]"
                      >
                        <td className="px-3 py-2 text-[#68746e]">
                          {product.rowNumber}
                        </td>
                        <td className="px-3 py-2">
                          {product.brand}
                        </td>
                        <td className="px-3 py-2 font-bold">
                          {product.name}
                        </td>
                        <td className="px-3 py-2">
                          ¥{product.price.toLocaleString('ja-JP')}
                        </td>
                        <td className="px-3 py-2">
                          {product.modelNumber || '—'}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2">
                          {product.description || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsed.products.length > 100 && (
                <p className="mt-2 text-xs text-[#68746e]">
                  プレビューは先頭100件まで表示しています。
                </p>
              )}
            </div>
          )}

          {progress && (
            <p className="text-sm font-bold text-[#315c4c]">
              {progress}
            </p>
          )}

          {resultMessage && (
            <p
              className={`whitespace-pre-wrap text-sm ${
                resultMessage.startsWith('✓')
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}
            >
              {resultMessage}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-[#dce5df] bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={registering}
            className="rounded-xl border border-[#dce5df] px-4 py-2 text-sm font-bold text-[#315c4c] hover:bg-[#f1f6f3] disabled:opacity-40"
          >
            閉じる
          </button>

          <button
            type="button"
            onClick={handleRegister}
            disabled={
              registering ||
              !categoryId ||
              parsed.products.length === 0 ||
              parsed.errors.length > 0
            }
            className="rounded-xl bg-[#315c4c] px-5 py-2 text-sm font-bold text-white hover:bg-[#284b3f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {registering
              ? '登録中…'
              : `${parsed.products.length}件を登録`}
          </button>
        </div>
      </div>
    </div>
  );
}

type ParsedBulkAiRating = {
  productId: number;
  productName: string;
  criterionId: number;
  criterionName: string;
  score: number;
  reason: string;
  rowNumber: number;
};

function normalizeMatchText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・･·()（）\[\]【】「」『』]/g, '');
}

function parseBulkAiRatings(
  input: string,
  products: AdminProductItem[],
  criteria: Array<{ id: number; categoryId: number; name: string }>,
) {
  const entries: ParsedBulkAiRating[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  input.split('\n').forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    const delimiter = line.includes('\t') ? '\t' : '|';
    const columns = line.split(delimiter).map((value) => value.trim());
    const rowNumber = index + 1;

    if (
      index === 0 &&
      normalizeMatchText(columns[0] ?? '') === '商品名または型番'
    ) {
      return;
    }

    if (columns.length < 4) {
      errors.push(`${rowNumber}行目：4項目を「|」またはタブで区切ってください`);
      return;
    }

    const [productKey, criterionKey, rawScore, ...reasonParts] = columns;
    const normalizedProductKey = normalizeMatchText(productKey);
    const productMatches = products.filter((product) => {
      const normalizedName = normalizeMatchText(product.name);
      const normalizedModel = normalizeMatchText(product.modelNumber ?? '');
      return (
        normalizedName === normalizedProductKey ||
        Boolean(normalizedModel && normalizedModel === normalizedProductKey)
      );
    });

    if (productMatches.length !== 1) {
      errors.push(
        `${rowNumber}行目：商品「${productKey}」が${
          productMatches.length === 0 ? '選択商品にありません' : '複数一致します'
        }`,
      );
      return;
    }

    const product = productMatches[0];
    const normalizedCriterionKey = normalizeMatchText(criterionKey);
    const criterionMatches = criteria.filter(
      (criterion) =>
        criterion.categoryId === product.categoryId &&
        normalizeMatchText(criterion.name) === normalizedCriterionKey,
    );

    if (criterionMatches.length !== 1) {
      errors.push(
        `${rowNumber}行目：「${product.name}」の基準「${criterionKey}」が見つかりません`,
      );
      return;
    }

    const scoreMatch = rawScore.match(/[1-5](?:\.5|\.0)?/);
    const score = scoreMatch ? Number(scoreMatch[0]) : NaN;
    if (
      !Number.isFinite(score) ||
      score < 1 ||
      score > 5 ||
      Math.round(score * 2) !== score * 2
    ) {
      errors.push(`${rowNumber}行目：評価は1〜5の0.5刻みで入力してください`);
      return;
    }

    const reason = reasonParts.join(delimiter).trim();
    if (!reason) {
      errors.push(`${rowNumber}行目：評価理由を入力してください`);
      return;
    }

    const criterion = criterionMatches[0];
    const duplicateKey = `${product.id}:${criterion.id}`;
    if (seen.has(duplicateKey)) {
      errors.push(`${rowNumber}行目：「${product.name}／${criterion.name}」が重複しています`);
      return;
    }
    seen.add(duplicateKey);

    entries.push({
      productId: product.id,
      productName: product.name,
      criterionId: criterion.id,
      criterionName: criterion.name,
      score,
      reason,
      rowNumber,
    });
  });

  return { entries, errors };
}

function BulkAiRatingsModal({
  products,
  onClose,
  onCompleted,
}: {
  products: AdminProductItem[];
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}) {
  const { data: criteria = [], isLoading: criteriaLoading } = useQuery({
    queryKey: ['admin-criteria'],
    queryFn: () => api.admin.criteria.list(),
  });
  const [bulkInput, setBulkInput] = useState('');
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const parsed = parseBulkAiRatings(bulkInput, products, criteria);
  const coveredProductCount = new Set(
    parsed.entries.map((entry) => entry.productId),
  ).size;

  async function handleSave() {
    if (parsed.entries.length === 0 || parsed.errors.length > 0) return;

    const confirmed = window.confirm(
      `${coveredProductCount}商品・${parsed.entries.length}件のAI評価を${
        publish ? '公開状態で' : '下書きとして'
      }保存しますか？`,
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage('');
    try {
      const result = await api.admin.products.saveAiRatingsBulk(
        parsed.entries.map((entry) => ({
          productId: entry.productId,
          criterionId: entry.criterionId,
          score: entry.score,
          reason: entry.reason,
        })),
        publish,
      );
      await onCompleted();
      setMessage(
        `✓ ${result.products}商品・${result.saved}件のAI評価を保存しました`,
      );
      setBulkInput('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '一括保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce5df] bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#1f2a25]">🤖 AI評価を一括登録</h2>
            <p className="mt-1 text-xs text-[#68746e]">
              選択した{products.length}商品へ、まとめてAI評価を保存します。
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="text-2xl leading-none text-[#68746e] hover:text-[#1f2a25] disabled:opacity-40">×</button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl bg-violet-50 p-4">
            <p className="text-sm font-bold text-violet-800">貼り付け形式</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-violet-700">
{`商品名または型番|評価基準名|評価|評価理由
ランドロック|収納・持ち運びやすさ|1.0|総重量24.5kgで車での運搬が前提です。
ランドロック|設営のしやすさ|2.0|大型で複数人での設営が適しています。`}
            </pre>
            <p className="mt-2 text-xs text-violet-700">
              ChatGPTへ選択商品とカテゴリの評価基準を渡し、この形式でまとめて出力させてください。星記号は不要です。
            </p>
          </div>

          <details className="rounded-xl border border-[#dce5df] px-4 py-3">
            <summary className="cursor-pointer text-sm font-bold text-[#315c4c]">対象商品を確認</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {products.map((product) => (
                <span key={product.id} className="rounded-full bg-[#f1f6f3] px-3 py-1 text-xs text-[#52615a]">
                  {product.name}{product.modelNumber ? `（${product.modelNumber}）` : ''}
                </span>
              ))}
            </div>
          </details>

          <label className="block">
            <span className="text-sm font-bold text-[#1f2a25]">AI評価データ</span>
            <textarea
              rows={14}
              value={bulkInput}
              onChange={(event) => {
                setBulkInput(event.target.value);
                setMessage('');
              }}
              disabled={saving || criteriaLoading}
              placeholder="商品名|評価基準名|評価|評価理由"
              className="mt-2 w-full resize-y rounded-xl border border-[#dce5df] px-3 py-3 font-mono text-sm outline-none focus:border-violet-500"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              保存可能：{coveredProductCount}商品・{parsed.entries.length}件
            </span>
            {parsed.errors.length > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">エラー：{parsed.errors.length}件</span>
            )}
          </div>

          {parsed.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">入力エラー</p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-600">
                {parsed.errors.map((error) => <li key={error}>・{error}</li>)}
              </ul>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-bold text-[#1f2a25]">
            <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} disabled={saving} className="h-4 w-4 accent-[#315c4c]" />
            保存後すぐ公開する
          </label>

          {message && <p className="whitespace-pre-wrap rounded-xl bg-[#f1f6f3] px-4 py-3 text-sm font-bold text-[#315c4c]">{message}</p>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#dce5df] bg-white px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#dce5df] px-5 py-2 text-sm font-bold text-[#52615a] disabled:opacity-40">閉じる</button>
          <button type="button" onClick={handleSave} disabled={saving || criteriaLoading || parsed.entries.length === 0 || parsed.errors.length > 0} className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? '保存中…' : `${parsed.entries.length}件を保存`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────
export default function AdminProducts() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api.admin.categories.list() });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkAiRatingsOpen, setBulkAiRatingsOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    () => new Set(),
  );

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products', filterStatus, filterCategoryId],
    queryFn: () => api.admin.products.list({
      status: filterStatus || undefined,
      categoryId: filterCategoryId ? parseInt(filterCategoryId, 10) : undefined,
    }),
  });

  const selectedProducts = products.filter((product) =>
    selectedProductIds.has(product.id),
  );
  const allVisibleSelected =
    products.length > 0 &&
    products.every((product) => selectedProductIds.has(product.id));

  function toggleProductSelection(productId: number) {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleAllVisibleProducts() {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        products.forEach((product) => next.delete(product.id));
      } else {
        products.forEach((product) => next.add(product.id));
      }
      return next;
    });
  }

  // Ratings panel state
  const [ratingsProductId, setRatingsProductId] = useState<number | null>(null);

  // AI ratings modal state
  const [aiRatingsProduct, setAiRatingsProduct] =
    useState<AdminProductItem | null>(null);

  // Form state
  const [mode, setMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editTarget, setEditTarget] = useState<AdminProductItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setForm({ ...EMPTY_FORM, categoryId: filterCategoryId || '' });
    setEditTarget(null);
    setMode('add');
  }

  function openEdit(p: AdminProductItem) {
    setForm({
      categoryId: String(p.categoryId),
      brand: p.brand,
      name: p.name,
      modelNumber: p.modelNumber,
      janCode: p.janCode ?? '',
      price: String(p.price),
      description: p.description ?? '',
      status: p.status,
      imageUrls: p.images.join('\n'),
      amazonAffiliateUrl: p.amazonAffiliateUrl ?? '',
      asin: p.asin ?? '',
    });
    setEditTarget(p);
    setMode('edit');
    // Scroll to form
    setTimeout(() => document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function closeForm() { setMode('none'); setEditTarget(null); }

  function formToPayload() {
    return {
      categoryId: parseInt(form.categoryId, 10),
      brand: form.brand.trim(),
      name: form.name.trim(),
      modelNumber: form.modelNumber.trim(),
      janCode: form.janCode.trim() || undefined,
      price: parseInt(form.price, 10) || 0,
      description: form.description.trim() || undefined,
      status: form.status,
      images: form.imageUrls.split('\n').map((u) => u.trim()).filter(Boolean),
      amazonAffiliateUrl: form.amazonAffiliateUrl.trim() || null,
      asin: form.asin.trim() || null,
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === 'add') {
        await api.admin.products.create(formToPayload());
      } else if (mode === 'edit' && editTarget) {
        await api.admin.products.update(editTarget.id, formToPayload());
      }
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      closeForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(product: AdminProductItem, newStatus: string) {
    await api.admin.products.updateStatus(product.id, newStatus);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
  }

  async function handleDelete(product: AdminProductItem) {
    if (!confirm(`「${product.name}」を削除しますか？この操作は元に戻せません。`)) return;
    await api.admin.products.delete(product.id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    if (editTarget?.id === product.id) closeForm();
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1f2a25]">商品管理</h1>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBulkAiRatingsOpen(true)}
            disabled={selectedProducts.length === 0}
            className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            🤖 AI評価を一括登録（{selectedProducts.length}）
          </button>

          <button
            type="button"
            onClick={() => setBulkImportOpen(true)}
            className="rounded-xl border border-[#315c4c] bg-white px-4 py-2 text-sm font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]"
          >
            📥 一括登録
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="rounded-xl bg-[#315c4c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#284b3f]"
          >
            + 商品を追加
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c]">
          <option value="">すべてのステータス</option>
          <option value="active">公開中</option>
          <option value="pending">保留中</option>
          <option value="rejected">却下</option>
        </select>
        <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}
          className="rounded-xl border border-[#dce5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#315c4c]">
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <span className="ml-auto self-center text-sm text-[#68746e]">{products.length} 件</span>
      </div>

      {/* Add/Edit form */}
      {mode !== 'none' && (
        <div id="product-form">
          <ProductForm
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={closeForm}
            saving={saving}
            title={mode === 'add' ? '新しい商品を追加' : `「${editTarget?.name}」を編集`}
          />
        </div>
      )}

      {/* Table */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#dce5df] bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#68746e]">読み込み中…</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#68746e]">
            商品がありません。「+ 商品を追加」から追加してください。
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#dce5df] bg-[#f8faf8]">
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleProducts}
                    aria-label="表示中の商品をすべて選択"
                    className="h-4 w-4 accent-[#315c4c]"
                  />
                </th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">商品名</th>
                <th className="hidden px-4 py-3 text-left font-bold text-[#68746e] sm:table-cell">カテゴリ</th>
                <th className="hidden px-4 py-3 text-left font-bold text-[#68746e] md:table-cell">価格</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">ステータス</th>
                <th className="px-4 py-3 text-left font-bold text-[#68746e]">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const ratingsOpen = ratingsProductId === p.id;
                const isLast = i === products.length - 1;
                return (
                  <Fragment key={p.id}>
                    <tr
                      className={`border-b border-[#dce5df] transition hover:bg-[#f8faf8] ${
                        editTarget?.id === p.id ? 'bg-[#f1f6f3]' : ''
                      } ${isLast && !ratingsOpen ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(p.id)}
                          onChange={() => toggleProductSelection(p.id)}
                          aria-label={`${p.name}を選択`}
                          className="h-4 w-4 accent-[#315c4c]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            <img src={p.images[0]} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; el.nextElementSibling?.classList.remove('hidden'); }} />
                          ) : null}
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f6f3] text-lg${p.images[0] ? ' hidden' : ''}`}>📦</div>
                          <div>
                            <p className="font-bold text-[#1f2a25]">{p.name}</p>
                            <p className="text-xs text-[#68746e]">{p.brand}{p.modelNumber ? ` · ${p.modelNumber}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-[#68746e] sm:table-cell">
                        {categories.find((c) => c.id === p.categoryId)?.name ?? '-'}
                      </td>
                      <td className="hidden px-4 py-3 text-[#1f2a25] md:table-cell">
                        ¥{p.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => setRatingsProductId(ratingsOpen ? null : p.id)}
                            className={`rounded-lg px-2 py-1 text-xs font-bold transition ${ratingsOpen ? 'bg-[#315c4c] text-white' : 'bg-[#e8f0eb] text-[#315c4c] hover:bg-[#d5e5da]'}`}>
                            評価 {p.reviewCount > 0 ? `(${p.reviewCount})` : ''}▾
                          </button>
                          <button
                            onClick={() => setAiRatingsProduct(p)}
                            className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
                          >
                            🤖 AI評価
                          </button>
                          <button onClick={() => openEdit(p)}
                            className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100">
                            編集
                          </button>
                          {p.status !== 'active' && (
                            <button onClick={() => handleStatusChange(p, 'active')}
                              className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100">
                              公開
                            </button>
                          )}
                          {p.status === 'active' && (
                            <button onClick={() => handleStatusChange(p, 'pending')}
                              className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100">
                              保留
                            </button>
                          )}
                          <button onClick={() => handleDelete(p)}
                            className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100">
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                    {ratingsOpen && (
                      <RatingsPanel productId={p.id} productName={p.name} />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {bulkImportOpen && (
        <BulkProductImportModal
          categories={categories}
          initialCategoryId={filterCategoryId}
          onClose={() => setBulkImportOpen(false)}
          onCompleted={async () => {
            await qc.invalidateQueries({
              queryKey: ['admin-products'],
            });
          }}
        />
      )}

      {bulkAiRatingsOpen && selectedProducts.length > 0 && (
        <BulkAiRatingsModal
          products={selectedProducts}
          onClose={() => setBulkAiRatingsOpen(false)}
          onCompleted={async () => {
            for (const product of selectedProducts) {
              await qc.invalidateQueries({
                queryKey: ['admin-product-ai-ratings', product.id],
              });
            }
          }}
        />
      )}

      {aiRatingsProduct && (
        <AiRatingsModal
          product={aiRatingsProduct}
          onClose={() => setAiRatingsProduct(null)}
        />
      )}
    </AdminLayout>
  );
}
