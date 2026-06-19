'use client';

import React from 'react';

interface WorkerStat {
  id: number;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalHours: number;
}

interface Props {
  data: WorkerStat[];
}

export function WorkloadChart({ data }: Props) {
  if (!data.length) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
        데이터가 없습니다.
      </div>
    );
  }

  const maxTasks = Math.max(...data.map((d) => d.totalTasks), 1);
  const BAR_HEIGHT = 24;
  const GAP = 12;
  const LABEL_WIDTH = 80;
  const BAR_MAX = 300;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        width={LABEL_WIDTH + BAR_MAX + 60}
        height={data.length * (BAR_HEIGHT + GAP) + 20}
      >
        {data.map((worker, i) => {
          const y = i * (BAR_HEIGHT + GAP) + 10;
          const completedW = Math.round((worker.completedTasks / maxTasks) * BAR_MAX);
          const inProgressW = Math.round((worker.inProgressTasks / maxTasks) * BAR_MAX);

          return (
            <g key={worker.id}>
              {/* 이름 레이블 */}
              <text
                x={LABEL_WIDTH - 8}
                y={y + BAR_HEIGHT / 2 + 4}
                textAnchor="end"
                fontSize={12}
                fill="#374151"
              >
                {worker.name}
              </text>

              {/* 완료 바 */}
              <rect
                x={LABEL_WIDTH}
                y={y}
                width={completedW}
                height={BAR_HEIGHT}
                fill="#059669"
                rx={3}
              />
              {/* 진행 중 바 */}
              <rect
                x={LABEL_WIDTH + completedW}
                y={y}
                width={inProgressW}
                height={BAR_HEIGHT}
                fill="#1A56DB"
                rx={3}
              />

              {/* 건수 텍스트 */}
              <text
                x={LABEL_WIDTH + completedW + inProgressW + 6}
                y={y + BAR_HEIGHT / 2 + 4}
                fontSize={11}
                fill="#6B7280"
              >
                {worker.totalTasks}건 / {worker.totalHours}h
              </text>
            </g>
          );
        })}
      </svg>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#6B7280' }}>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: '#059669', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
          완료
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: '#1A56DB', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
          진행중
        </span>
      </div>
    </div>
  );
}
