import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { CompareSelection } from '../compare-params';
import styles from './ComparePicker.module.css';

type Choice = { slug: string; name: string; years: string };
const SLOTS = [
  ['a', 'First', ''],
  ['b', 'Second', ''],
  ['c', 'Third', ' (optional)'],
  ['d', 'Fourth', ' (optional)'],
] as const;

interface Props {
  selection: CompareSelection;
  terms: Choice[];
  persons: Choice[];
  topics: { slug: string; name: string }[];
}

/** A plain GET form, so every comparison has a link people can share. Choices are in date order. */
export function ComparePicker({ selection, terms, persons, topics }: Props) {
  const byPerson = selection.by === 'person';
  const choices = byPerson ? persons : terms;
  const noun = byPerson ? 'leader' : 'government';
  return (
    <form method="get" className={styles.picker}>
      <nav aria-label="Compare by" className={styles.mode}>
        <Link href={`?topic=${selection.topic}`} aria-current={byPerson ? undefined : 'page'}>
          By government
        </Link>
        <Link
          href={`?by=person&topic=${selection.topic}`}
          aria-current={byPerson ? 'page' : undefined}
        >
          By leader
        </Link>
      </nav>
      {byPerson && <input type="hidden" name="by" value="person" />}
      <div className={styles.fields}>
        {SLOTS.map(([key, label, optional], i) => (
          <label key={key}>
            <span>
              {label} {noun}
              {optional && <span className={styles.optional}>{optional}</span>}
            </span>
            <select name={key} defaultValue={selection.slugs[i] ?? ''}>
              <option value="">{i < 2 ? 'Choose…' : 'None'}</option>
              {choices.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.years})
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Topic
          <select name="topic" defaultValue={selection.topic}>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <Button>Compare</Button>
      </div>
    </form>
  );
}
