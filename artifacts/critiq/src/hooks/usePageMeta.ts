import { useEffect } from 'react';

const DEFAULT_TITLE = 'CRITIQ｜あなたの基準で商品を探せる比較・口コミサービス';
const DEFAULT_DESCRIPTION =
  'CRITIQは、ユーザーが大切にする基準から商品を比較・検索できるサービスです。アウトドア用品を中心に、口コミや評価を参考に自分に合う商品を探せます。';

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOgMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * ページごとにtitle・meta descriptionを動的に設定する。
 * アンマウント時（別ページへ遷移）はデフォルト値に戻す。
 */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    const resolvedTitle = title ?? DEFAULT_TITLE;
    const resolvedDesc = description ?? DEFAULT_DESCRIPTION;

    document.title = resolvedTitle;
    setMeta('description', resolvedDesc);
    setOgMeta('og:title', resolvedTitle);
    setOgMeta('og:description', resolvedDesc);
    setMeta('twitter:title', resolvedTitle);
    setMeta('twitter:description', resolvedDesc);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('description', DEFAULT_DESCRIPTION);
      setOgMeta('og:title', DEFAULT_TITLE);
      setOgMeta('og:description', DEFAULT_DESCRIPTION);
      setMeta('twitter:title', DEFAULT_TITLE);
      setMeta('twitter:description', DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
