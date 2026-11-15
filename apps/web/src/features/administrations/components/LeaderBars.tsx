import { type IsoDate, periodDays, toEpochDay } from '@gpip/core';
import type { AdministrationLeader } from '@gpip/db';
import { formatRange } from '@/lib/format';
import { LEADER_ROLE_LABELS } from '../labels';

interface Props {
  leaders: AdministrationLeader[];
  start: IsoDate;
  /** Administration end, or today for the incumbent. */
  end: IsoDate;
  adminEnd: IsoDate | null;
}

/** Each leader as a bar positioned within the administration's tenure. */
export function LeaderBars({ leaders, start, end, adminEnd }: Props) {
  const total = Math.max(1, periodDays({ start, end }));
  return (
    <ul className="leaders">
      {leaders.map((l) => {
        const to = l.endDate ?? end;
        const left = ((toEpochDay(l.startDate) - toEpochDay(start)) / total) * 100;
        const width = (periodDays({ start: l.startDate, end: to }) / total) * 100;
        return (
          <li
            key={`${l.personSlug}-${l.role}-${l.startDate}`}
            className="leader"
            data-role={l.role}
          >
            <div className="leader-text">
              <strong>{l.fullName}</strong>
              <span className="leader-role">{l.label ?? LEADER_ROLE_LABELS[l.role]}</span>
              <span className="leader-dates">
                {formatRange(l.startDate, l.endDate ?? adminEnd)}
              </span>
            </div>
            <div className="leader-track" aria-hidden="true">
              <span style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
