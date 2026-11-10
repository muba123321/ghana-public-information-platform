import type { EstimateType, IsoDate } from '@gpip/core';

/** One value as a publisher reports it, before it becomes an observation. */
export interface RawPoint {
  year: string;
  value: number | null;
  estimateType: EstimateType;
}

/** Fetches one publisher's series; the pipeline handles storage, vintages and logging. */
export interface SourceAdapter {
  sourceKey: string;
  fetch(
    seriesCode: string,
    ctx: { today: IsoDate; defaultEstimateType: EstimateType },
  ): Promise<RawPoint[]>;
}

export interface ImportRunResult {
  status: 'ok' | 'failed';
  indicatorsChecked: number;
  vintagesWritten: number;
  errors: string[];
}
