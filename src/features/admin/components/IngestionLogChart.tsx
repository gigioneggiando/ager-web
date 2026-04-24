"use client";

import type { IngestionLogStatsResponse } from "@/lib/api/types";

type DailyTotals = { day: string; ingested: number; skipped: number; errors: number };

function aggregateByDay(stats: IngestionLogStatsResponse): DailyTotals[] {
  const map = new Map<string, DailyTotals>();
  for (const p of stats.points) {
    const cur = map.get(p.day) ?? { day: p.day, ingested: 0, skipped: 0, errors: 0 };
    cur.ingested += p.articlesIngested;
    cur.skipped += p.articlesSkipped;
    cur.errors += p.runsWithErrors;
    map.set(p.day, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
}

export default function IngestionLogChart({ stats }: { stats: IngestionLogStatsResponse }) {
  const days = aggregateByDay(stats);
  const max = Math.max(1, ...days.map((d) => d.ingested + d.skipped));
  const barWidth = 22;
  const gap = 6;
  const chartHeight = 120;
  const width = Math.max(240, days.length * (barWidth + gap) + gap);

  return (
    <figure className="rounded-md border p-3">
      <figcaption className="mb-2 text-xs text-muted-foreground">
        Ingested (green) vs skipped (amber) — last {stats.windowDays} days
      </figcaption>
      <svg
        role="img"
        aria-label={`Ingested vs skipped over ${stats.windowDays} days`}
        viewBox={`0 0 ${width} ${chartHeight + 20}`}
        className="w-full"
      >
        {days.map((d, i) => {
          const total = d.ingested + d.skipped;
          const ingestedH = (d.ingested / max) * chartHeight;
          const skippedH = (d.skipped / max) * chartHeight;
          const x = gap + i * (barWidth + gap);
          return (
            <g key={d.day}>
              <title>{`${d.day} — ingested: ${d.ingested}, skipped: ${d.skipped}, runs with errors: ${d.errors}`}</title>
              {/* Skipped is drawn on top of ingested (stacked). */}
              <rect
                x={x}
                y={chartHeight - ingestedH}
                width={barWidth}
                height={ingestedH}
                fill="#059669"
              />
              <rect
                x={x}
                y={chartHeight - ingestedH - skippedH}
                width={barWidth}
                height={skippedH}
                fill="#f59e0b"
              />
              {total === 0 && (
                <rect x={x} y={chartHeight - 1} width={barWidth} height={1} fill="#d4d4d8" />
              )}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 12}
                textAnchor="middle"
                fontSize="8"
                fill="currentColor"
                opacity={0.6}
              >
                {d.day.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
