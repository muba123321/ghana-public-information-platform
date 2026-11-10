'use client';

import { useEffect, useRef } from 'react';
import type { ChartModel } from '../lib/chart';
import { formatValue } from '../lib/number';

interface Props {
  model: ChartModel;
  name: string;
  unit: string;
}

const css = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

/**
 * Interactive chart (ECharts, loaded only on indicator pages). Shaded bands show who was in office —
 * timing, not cause. Projections are dashed and separate. The table below carries the same data.
 */
export function IndicatorChart({ model, name, unit }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || model.years.length === 0) return;
    let disposed = false;
    let chart: { dispose(): void; resize(): void } | undefined;
    const onResize = () => chart?.resize();

    (async () => {
      const echarts = await import('echarts/core');
      const [{ LineChart, ScatterChart }, components, { SVGRenderer }] = await Promise.all([
        import('echarts/charts'),
        import('echarts/components'),
        import('echarts/renderers'),
      ]);
      echarts.use([
        LineChart,
        ScatterChart,
        components.GridComponent,
        components.TooltipComponent,
        components.MarkAreaComponent,
        components.MarkLineComponent,
        SVGRenderer,
      ]);
      if (disposed) return;

      const text = css(el, '--text');
      const muted = css(el, '--muted');
      const line = css(el, '--line');
      const toneA = css(el, '--band-a');
      const toneB = css(el, '--band-b');
      const toneMil = css(el, '--band-military');
      const series = css(el, '--series');
      const projection = css(el, '--projection');
      const bandAt = (year: string) =>
        model.bands.filter((b) => b.from <= year && year <= b.to).map((b) => b.name);

      const instance = echarts.init(el, undefined, { renderer: 'svg' });
      chart = instance;
      instance.setOption({
        animationDuration: 600,
        grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
        // Numerals in the display face: the body face's slashed zero reads as code.
        textStyle: { fontFamily: css(el, '--font-display') || 'system-ui', color: text },
        xAxis: {
          type: 'category',
          data: model.years,
          boundaryGap: false,
          axisLine: { lineStyle: { color: line } },
          axisLabel: { color: muted },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          scale: true,
          splitLine: { lineStyle: { color: line } },
          axisLabel: { color: muted, formatter: (v: number) => formatValue(v, { compact: true }) },
        },
        tooltip: {
          trigger: 'axis',
          formatter: (
            params: { axisValue: string; seriesName: string; value: number | null }[],
          ) => {
            const year = params[0]?.axisValue ?? '';
            const lines = params
              .filter((p) => p.value !== null && p.value !== undefined)
              .map((p) => `${p.seriesName}: <b>${formatValue(Number(p.value))}</b> ${unit}`);
            const inOffice = bandAt(year);
            return [
              `<b>${year}</b>`,
              ...(lines.length ? lines : ['Not available']),
              inOffice.length
                ? `<span style="color:${muted}">In office during ${year}: ${inOffice.join(', ')}</span>`
                : '',
            ].join('<br/>');
          },
        },
        series: [
          {
            name,
            type: model.sparse ? 'scatter' : 'line',
            data: model.actual,
            connectNulls: false,
            showSymbol: model.sparse,
            symbolSize: 9,
            lineStyle: { width: 2.5, color: series },
            itemStyle: { color: series },
            markArea: {
              silent: true,
              data: model.bands.map((b) => [
                {
                  xAxis: b.from,
                  itemStyle: {
                    color: b.kind === 'military' ? toneMil : b.tone === 'a' ? toneA : toneB,
                  },
                },
                { xAxis: b.to },
              ]),
            },
            markLine: {
              symbol: 'none',
              label: { show: false },
              lineStyle: { color: muted, type: 'dotted', width: 1 },
              tooltip: { formatter: (p: { name: string }) => p.name },
              data: model.events.map((e) => ({ xAxis: e.year, name: `${e.year}: ${e.title}` })),
            },
          },
          ...(model.hasProjection
            ? [
                {
                  name: 'IMF projection',
                  type: 'line',
                  data: model.projected,
                  connectNulls: false,
                  showSymbol: false,
                  lineStyle: { width: 2, type: 'dashed', color: projection },
                  itemStyle: { color: projection },
                },
              ]
            : []),
        ],
      });
      window.addEventListener('resize', onResize);
    })();

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      chart?.dispose();
    };
  }, [model, name, unit]);

  const span = model.years.length ? `${model.years[0]} to ${model.years.at(-1)}` : 'no years';
  return (
    <div
      ref={ref}
      className="indicator-chart"
      role="img"
      aria-label={`Chart of ${name} (${unit}), ${span}. Shaded bands show the government in office; the table below lists every value.`}
    />
  );
}
