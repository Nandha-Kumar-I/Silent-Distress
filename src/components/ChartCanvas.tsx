import React, { useEffect, useRef } from 'react';
import {
  Chart,
  ChartConfiguration,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

interface ChartCanvasProps {
  config: ChartConfiguration;
  height?: number;
  className?: string;
}

export const ChartCanvas: React.FC<ChartCanvasProps> = ({
  config,
  height = 260,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      ...config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...config.options,
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [config]);

  return (
    <div className={`relative w-full ${className}`} style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
