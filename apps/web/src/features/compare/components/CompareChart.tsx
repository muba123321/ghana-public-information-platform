'use client';

import { useEffect, useRef } from 'react';
import { formatValue } from '@/features/indicators';
import type { CompareSeries } from '../chart-options';
import styles from './CompareChart.module.css';

const css = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

/**
 * Small multiple for one indicator: each government's line starts at year 0 with the value it
 * inherited. Colours are the selection order's tones, never party colours.
 */
export function CompareChart({
  series,
  name,
  unit,
}: {
  series: CompareSeries[];
  name: string;
  unit: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || series.every((s) => s.data.length === 0)) return;
    let disposed = false;
    let chart: { dispose(): void; resize(): void } | undefined;
    const onResize = () => chart?.resize();

    (async () => {
      const echarts = await import('echarts/core');
      const [{ LineChart }, components, { SVGRenderer }] = await Promise.all([
        import('echarts/charts'),
        import('echarts/components'),
        import('echarts/renderers'),
      ]);
      echarts.use([LineChart, components.GridComponent, components.TooltipComponent, SVGRenderer]);
      if (disposed) return;
      const muted = css(el, '--muted');
      const line = css(el, '--line');
      const instance = echarts.init(el, undefined, { renderer: 'svg' });
      chart = instance;
      instance.setOption({
        animationDuration: 500,
        grid: { left: 8, right: 16, top: 16, bottom: 24, containLabel: true },
        textStyle: {
          fontFamily: css(el, '--font-display') || 'system-ui',
          color: css(el, '--text'),
        },
        tooltip: {
          trigger: 'axis',
          valueFormatter: (v: unknown) =>
            typeof v === 'number' ? `${formatValue(v)} ${unit}` : 'Not available',
        },
        xAxis: {
          type: 'value',
          name: 'Years in office (0 = inherited)',
          nameLocation: 'middle',
          nameGap: 26,
          minInterval: 1,
          axisLine: { lineStyle: { color: line } },
          axisLabel: { color: muted },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: { color: muted, formatter: (v: number) => formatValue(v, { compact: true }) },
          splitLine: { lineStyle: { color: line, opacity: 0.5 } },
        },
        series: series.map((s) => {
          const colour = css(el, `--tone-${s.tone}`);
          return {
            type: 'line',
            name: s.name,
            data: s.data,
            connectNulls: false,
            symbolSize: 7,
            lineStyle: { color: colour, width: 2.5 },
            itemStyle: { color: colour },
            // The inherited value is drawn hollow, so it never reads as the government's own result.
            symbol: (value: [number, number | null, number]) =>
              value[0] === 0 ? 'emptyCircle' : 'circle',
            endLabel: {
              show: true,
              color: colour,
              formatter: (p: { value: [number, number, number] }) =>
                `${formatValue(p.value[1])} (${p.value[2]})`,
            },
          };
        }),
      });
      window.addEventListener('resize', onResize);
    })();

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      chart?.dispose();
    };
  }, [series, unit]);

  if (series.every((s) => s.data.length === 0)) {
    return <p className={styles.empty}>No figures published for these governments.</p>;
  }
  return (
    <div
      ref={ref}
      className={styles.compareChart}
      role="img"
      aria-label={`Chart of ${name} (${unit}) for ${series.map((s) => s.name).join(', ')}, from the value each inherited. The table lists every figure.`}
    />
  );
}
