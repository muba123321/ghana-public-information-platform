import { annualPeriod, type ObservationPoint } from '@gpip/core';
import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { buildChartModel } from '../lib/chart';
import { SeriesTable } from './SeriesTable';
import { Sparkline } from './Sparkline';

const pt = (
  y: number,
  v: number | null,
  e: ObservationPoint['estimateType'] = 'reported',
): ObservationPoint => ({
  period: annualPeriod(y),
  value: v,
  estimateType: e,
  vintage: '2026-11-10',
});

it('lists every year newest first, with gaps as Not available', () => {
  const model = buildChartModel([pt(2015, 1.5), pt(2017, 3)], [], [], '2026-11-10');
  render(<SeriesTable model={model} unit="%" modelled={false} />);
  const rows = screen.getAllByRole('row').slice(1);
  expect(rows.map((r) => within(r).getAllByRole('cell')[0]?.textContent)).toEqual([
    '2017',
    '2016',
    '2015',
  ]);
  expect(within(rows[1]!).getByText('Not available')).toBeInTheDocument();
});

it('labels projections and modelled estimates', () => {
  const model = buildChartModel([pt(2025, 80), pt(2026, 79, 'projected')], [], [], '2026-11-10');
  render(<SeriesTable model={model} unit="% of GDP" modelled />);
  expect(screen.getByText('IMF projection')).toBeInTheDocument();
  expect(screen.getByText('Modelled estimate')).toBeInTheDocument();
});

it('lists only survey years for sparse series', () => {
  const model = buildChartModel([pt(1987, 50), pt(1998, 40), pt(2016, 25)], [], [], '2026-11-10');
  render(<SeriesTable model={model} unit="%" modelled={false} />);
  expect(screen.getAllByRole('row')).toHaveLength(4);
});

it('draws a sparkline that breaks at missing years', () => {
  const { container } = render(<Sparkline values={[1, 2, null, 4, 5]} label="Inflation trend" />);
  expect(container.querySelectorAll('path')).toHaveLength(2);
  expect(screen.getByRole('img', { name: 'Inflation trend' })).toBeInTheDocument();
});

it('draws nothing for an empty series', () => {
  const { container } = render(<Sparkline values={[]} label="Empty" />);
  expect(container.querySelector('path')).toBeNull();
});
