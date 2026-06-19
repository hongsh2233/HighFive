'use client';

import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DailyLog {
  date: string;
  hours: number;
}

interface Props {
  data: DailyLog[];
  title?: string;
}

export function TimeLogChart({ data, title }: Props) {
  if (!data.length) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
        기록된 공수가 없습니다.
      </div>
    );
  }

  const maxHours = Math.max(...data.map((d) => d.hours), 1);
  const CHART_H = 120;
  const BAR_W = 32;
  const GAP = 8;
  const PADDING = { top: 16, bottom: 36, left: 40, right: 12 };
  const totalW = PADDING.left + data.length * (BAR_W + GAP) - GAP + PADDING.right;
  const totalH = CHART_H + PADDING.top + PADDING.bottom;

  return (
    <div style={{ overflowX: 'auto' }}>
      {title && (
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#374151' }}>{title}</p>
      )}
      <svg width={totalW} height={totalH}>
        {/* Y축 눈금 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = PADDING.top + CHART_H * (1 - ratio);
          const label = (maxHours * ratio).toFixed(1);
          return (
            <g key={ratio}>
              <line x1={PADDING.left} x2={totalW - PADDING.right} y1={y} y2={y} stroke="#F3F4F6" strokeWidth={1} />
              <text x={PADDING.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">
                {label}h
              </text>
            </g>
          );
        })}

        {/* 바 */}
        {data.map((d, i) => {
          const barH = Math.max((d.hours / maxHours) * CHART_H, 2);
          const x = PADDING.left + i * (BAR_W + GAP);
          const y = PADDING.top + CHART_H - barH;

          return (
            <g key={d.date}>
              <rect x={x} y={y} width={BAR_W} height={barH} fill="#1A56DB" rx={3} />
              <text
                x={x + BAR_W / 2}
                y={PADDING.top + CHART_H + 14}
                textAnchor="middle"
                fontSize={10}
                fill="#6B7280"
              >
                {format(new Date(d.date), 'M/d', { locale: ko })}
              </text>
              {d.hours > 0 && (
                <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize={10} fill="#374151">
                  {d.hours.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
