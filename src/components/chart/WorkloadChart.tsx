'use client';

import React from 'react';
import styles from './WorkloadChart.module.css';

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
      <div className={styles.empty}>
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
    <div className={styles.wrapper}>
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
      <div className={styles.legend}>
        <span>
          <span className={styles.legendDotCompleted} />
          완료
        </span>
        <span>
          <span className={styles.legendDotProgress} />
          진행중
        </span>
      </div>
    </div>
  );
}
