param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path -LiteralPath "package.json")) {
    throw "package.json was not found. Put the scripts folder directly under C:\src\critiq-web."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $projectRoot ("backups\results-" + $timestamp)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Backup-File {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    $source = Join-Path $projectRoot $RelativePath

    if (-not (Test-Path -LiteralPath $source)) {
        return
    }

    $destination = Join-Path $backupRoot $RelativePath
    $destinationDirectory = Split-Path -Parent $destination

    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
}

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $path = Join-Path $projectRoot $RelativePath
    $directory = Split-Path -Parent $path

    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    [System.IO.File]::WriteAllText($path, $Content, $utf8NoBom)

    Write-Host ("Updated: " + $RelativePath) -ForegroundColor Green
}

$targets = @(
    "components\ProductCard.tsx",
    "components\CriteriaSelector.tsx",
    "data\products.ts",
    "data\criteria.ts",
    "types\product.ts",
    "lib\calculateMatch.ts",
    "app\explore\[categoryId]\results\page.tsx"
)

foreach ($target in $targets) {
    Backup-File -RelativePath $target
}

Write-Utf8File -RelativePath "types\product.ts" -Content @'
export type ProductRating = {
  score: number;
  count: number;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  brand: string;
  price: number;
  reviewCount: number;
  ratings: Record<string, ProductRating>;
};

export type MatchCriterion = {
  id: string;
  name: string;
  score: number;
  count: number;
};

export type MatchResult = {
  percentage: number;
  averageScore: number;
  overallAverageScore: number;
  reviewCount: number;
  matchedCriteria: MatchCriterion[];
  otherCriteria: MatchCriterion[];
};
'@

Write-Utf8File -RelativePath "data\criteria.ts" -Content @'
export type CriterionDefinition = {
  id: string;
  name: string;
};

export const criteriaDefinitions: CriterionDefinition[] = [
  { id: "easy-setup", name: "設営しやすさ" },
  { id: "lightweight", name: "軽さ" },
  { id: "wind-resistant", name: "耐風性" },
  { id: "waterproof", name: "防水性" },
  { id: "spacious", name: "居住性" },
];

export const criteriaLabels: Record<string, string> =
  Object.fromEntries(
    criteriaDefinitions.map(({ id, name }) => [id, name]),
  );

export function getCriterionLabel(criterionId: string): string {
  return criteriaLabels[criterionId] ?? criterionId;
}
'@

Write-Utf8File -RelativePath "data\products.ts" -Content @'
import type { Product } from "@/types/product";

export const products: Product[] = [
  {
    id: "tent-001",
    categoryId: "tent",
    name: "エントリードームテント",
    brand: "CRITIQ Outdoor",
    price: 29800,
    reviewCount: 126,
    ratings: {
      "easy-setup": { score: 4.8, count: 126 },
      lightweight: { score: 4.1, count: 98 },
      "wind-resistant": { score: 4.3, count: 110 },
      waterproof: { score: 4.2, count: 87 },
      spacious: { score: 4.7, count: 143 },
    },
  },
  {
    id: "tent-002",
    categoryId: "tent",
    name: "軽量ツーリングテント",
    brand: "FIELD BASE",
    price: 24800,
    reviewCount: 105,
    ratings: {
      "easy-setup": { score: 4.4, count: 84 },
      lightweight: { score: 4.9, count: 105 },
      "wind-resistant": { score: 4.0, count: 68 },
      waterproof: { score: 4.1, count: 72 },
      spacious: { score: 3.6, count: 77 },
    },
  },
  {
    id: "tent-003",
    categoryId: "tent",
    name: "ファミリー2ルームテント",
    brand: "NORTH GARDEN",
    price: 69800,
    reviewCount: 132,
    ratings: {
      "easy-setup": { score: 3.7, count: 74 },
      lightweight: { score: 2.9, count: 58 },
      "wind-resistant": { score: 4.8, count: 103 },
      waterproof: { score: 4.7, count: 96 },
      spacious: { score: 4.9, count: 132 },
    },
  },
];
'@

Write-Utf8File -RelativePath "lib\calculateMatch.ts" -Content @'
import { getCriterionLabel } from "@/data/criteria";
import type {
  MatchCriterion,
  MatchResult,
  Product,
} from "@/types/product";

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function createCriterion(
  product: Product,
  criterionId: string,
): MatchCriterion | null {
  const rating = product.ratings[criterionId];

  if (!rating) {
    return null;
  }

  return {
    id: criterionId,
    name: getCriterionLabel(criterionId),
    score: rating.score,
    count: rating.count,
  };
}

export function calculateMatch(
  product: Product,
  selectedCriteria: string[],
): MatchResult {
  const validSelectedCriteria = Array.from(
    new Set(selectedCriteria),
  ).filter((criterionId) => product.ratings[criterionId]);

  const matchedCriteria = validSelectedCriteria
    .map((criterionId) => createCriterion(product, criterionId))
    .filter(
      (criterion): criterion is MatchCriterion =>
        criterion !== null,
    );

  const selectedSet = new Set(validSelectedCriteria);

  const otherCriteria = Object.keys(product.ratings)
    .filter((criterionId) => !selectedSet.has(criterionId))
    .map((criterionId) => createCriterion(product, criterionId))
    .filter(
      (criterion): criterion is MatchCriterion =>
        criterion !== null,
    )
    .sort((a, b) => b.score - a.score);

  const averageScore =
    matchedCriteria.length > 0
      ? matchedCriteria.reduce(
          (total, criterion) => total + criterion.score,
          0,
        ) / matchedCriteria.length
      : 0;

  const allRatings = Object.values(product.ratings);

  const overallAverageScore =
    allRatings.length > 0
      ? allRatings.reduce(
          (total, rating) => total + rating.score,
          0,
        ) / allRatings.length
      : 0;

  return {
    percentage: Math.round((averageScore / 5) * 100),
    averageScore: roundToOneDecimal(averageScore),
    overallAverageScore: roundToOneDecimal(
      overallAverageScore,
    ),
    reviewCount: product.reviewCount,
    matchedCriteria,
    otherCriteria,
  };
}
'@

Write-Utf8File -RelativePath "components\ProductCard.tsx" -Content @'
import type {
  MatchCriterion,
  MatchResult,
  Product,
} from "@/types/product";

type ProductCardProps = {
  product: Product;
  match: MatchResult;
};

function StarRating({ score }: { score: number }) {
  const filledCount = Math.round(score);

  return (
    <span
      className="inline-flex items-center gap-2"
      aria-label={`5点満点中${score.toFixed(1)}点`}
    >
      <span className="text-amber-500" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) =>
          index < filledCount ? "★" : "☆",
        ).join("")}
      </span>
      <span className="font-bold text-slate-700">
        {score.toFixed(1)}
      </span>
    </span>
  );
}

function CriterionRow({
  criterion,
  selected,
}: {
  criterion: MatchCriterion;
  selected: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={
            selected
              ? "font-bold text-emerald-600"
              : "font-bold text-slate-400"
          }
          aria-hidden="true"
        >
          {selected ? "✔" : "△"}
        </span>
        <span className="truncate text-sm font-medium text-slate-700">
          {criterion.name}
        </span>
      </div>

      <StarRating score={criterion.score} />
    </li>
  );
}

export default function ProductCard({
  product,
  match,
}: ProductCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {product.brand}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {product.name}
          </h2>
          <p className="mt-3 font-semibold text-slate-700">
            ¥{product.price.toLocaleString("ja-JP")}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-emerald-700">
            あなたとの一致率
          </p>
          <p className="mt-1 text-3xl font-black text-emerald-700">
            {match.percentage}
            <span className="text-base">%</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-5">
        <StarRating score={match.overallAverageScore} />
        <span className="text-sm text-slate-500">
          （{match.reviewCount.toLocaleString("ja-JP")}件）
        </span>
      </div>

      <section className="mt-5">
        <h3 className="text-sm font-bold text-slate-900">
          評価されたポイント
        </h3>
        <ul className="mt-2 divide-y divide-slate-100">
          {match.matchedCriteria.map((criterion) => (
            <CriterionRow
              key={criterion.id}
              criterion={criterion}
              selected
            />
          ))}
        </ul>
      </section>

      {match.otherCriteria.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-bold text-slate-900">
            参考情報
          </h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {match.otherCriteria.map((criterion) => (
              <CriterionRow
                key={criterion.id}
                criterion={criterion}
                selected={false}
              />
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
      >
        商品を見る
      </button>
    </article>
  );
}
'@

Write-Utf8File -RelativePath "components\CriteriaSelector.tsx" -Content @'
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Criterion = {
  id: string;
  name: string;
  description?: string;
};

type CriteriaSelectorProps = {
  categoryId: string;
  criteria: Criterion[];
};

export default function CriteriaSelector({
  categoryId,
  criteria,
}: CriteriaSelectorProps) {
  const router = useRouter();
  const [selectedCriteria, setSelectedCriteria] =
    useState<string[]>([]);

  const toggleCriterion = (criterionId: string) => {
    setSelectedCriteria((current) =>
      current.includes(criterionId)
        ? current.filter((id) => id !== criterionId)
        : [...current, criterionId],
    );
  };

  const handleSearch = () => {
    if (selectedCriteria.length === 0) {
      return;
    }

    const query = selectedCriteria
      .map(
        (criterionId) =>
          `criteria=${encodeURIComponent(criterionId)}`,
      )
      .join("&");

    router.push(
      `/explore/${encodeURIComponent(categoryId)}/results?${query}`,
    );
  };

  return (
    <div>
      <div className="space-y-3">
        {criteria.map((criterion) => {
          const isSelected = selectedCriteria.includes(
            criterion.id,
          );

          return (
            <button
              key={criterion.id}
              type="button"
              onClick={() => toggleCriterion(criterion.id)}
              aria-pressed={isSelected}
              className={`w-full rounded-card border p-5 text-left transition ${
                isSelected
                  ? "border-brand-500 bg-brand-50"
                  : "border-border bg-card hover:border-brand-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-ink">
                    {criterion.name}
                  </p>

                  {criterion.description && (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {criterion.description}
                    </p>
                  )}
                </div>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    isSelected
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-border text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={handleSearch}
          disabled={selectedCriteria.length === 0}
          className="w-full rounded-2xl bg-brand-600 px-5 py-4 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          この基準で探す
        </button>

        <p className="mt-3 text-center text-sm text-muted">
          {selectedCriteria.length}件の基準を選択中
        </p>
      </div>
    </div>
  );
}
'@

Write-Utf8File -RelativePath "app\explore\[categoryId]\results\page.tsx" -Content @'
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import BottomNavigation from "@/components/BottomNavigation";
import ProductCard from "@/components/ProductCard";
import { getCriterionLabel } from "@/data/criteria";
import { products } from "@/data/products";
import { calculateMatch } from "@/lib/calculateMatch";

export default function ResultsPage() {
  const params = useParams<{ categoryId: string }>();
  const searchParams = useSearchParams();
  const categoryId = params.categoryId;

  const selectedCriteria = Array.from(
    new Set(
      searchParams
        .getAll("criteria")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  const matchedProducts = products
    .filter((product) => product.categoryId === categoryId)
    .map((product) => ({
      product,
      match: calculateMatch(product, selectedCriteria),
    }))
    .sort(
      (a, b) =>
        b.match.percentage - a.match.percentage ||
        b.match.overallAverageScore -
          a.match.overallAverageScore,
    );

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <div className="mx-auto max-w-md px-5 py-6">
        <Link
          href={`/explore/${categoryId}`}
          className="text-sm font-semibold text-slate-600"
        >
          ← 基準選択に戻る
        </Link>

        <header className="mt-6">
          <p className="text-sm font-semibold text-emerald-700">
            CRITIQ
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            検索結果
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            選択した基準との一致率が高い順に表示しています。
          </p>
        </header>

        <section className="mt-6">
          <p className="text-sm font-bold text-slate-900">
            選択した基準
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCriteria.length > 0 ? (
              selectedCriteria.map((criterionId) => (
                <span
                  key={criterionId}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  {getCriterionLabel(criterionId)}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                基準が選択されていません。
              </span>
            )}
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              商品一覧
            </h2>

            <p className="text-sm text-slate-500">
              {matchedProducts.length}件
            </p>
          </div>

          {matchedProducts.length > 0 ? (
            matchedProducts.map(({ product, match }) => (
              <ProductCard
                key={product.id}
                product={product}
                match={match}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-600">
                該当する商品がまだ登録されていません。
              </p>
            </div>
          )}
        </section>
      </div>

      <BottomNavigation />
    </main>
  );
}
'@

Write-Host ""
Write-Host "Files updated. Running build..." -ForegroundColor Cyan

& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed." -ForegroundColor Red
    Write-Host ("Backup: " + $backupRoot) -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "CRITIQ results patch completed." -ForegroundColor Green
Write-Host ("Backup: " + $backupRoot) -ForegroundColor Yellow
Write-Host "Run npm run dev to check the screen."
