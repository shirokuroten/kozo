import { useMemo, useState } from 'react';
import {
  addMonths,
  buildMonth,
  canGoNext,
  canGoPrev,
  logsInMonth,
  logsOn,
  monthOf,
  type DayCell,
  type YearMonth,
} from '../domain/history';
import { plainText } from '../domain/links';
import { formatShortDate } from '../domain/tree';
import type { ReviewLog, Tree } from '../domain/types';
import { Button } from './Button';
import { describeResult } from './historyText';
import { useI18n } from './i18n';
import { navigate } from './route';
import { TreePath } from './TreeView';

interface DayProps {
  cell: DayCell;
  isToday: boolean;
  selected: boolean;
  label: string;
  onSelect: (date: string) => void;
}

// A day is a number and, when something was reviewed, a count under it. No filled squares:
// the calendar is a record to look things up in, not a streak to keep alive
function Day({ cell, isToday, selected, label, onSelect }: DayProps) {
  if (cell.date === null) return <div />;
  const day = Number(cell.date.slice(8));
  const number = (
    <span className={isToday ? 'underline decoration-rule underline-offset-4' : ''}>{day}</span>
  );
  // The transparent border keeps every cell the same size whether or not it is selected
  const box = `flex h-12 w-full flex-col items-center rounded border pt-1 font-gothic text-sm text-sumi ${
    selected ? 'border-rule' : 'border-transparent'
  }`;
  if (cell.count === 0) return <div className={box}>{number}</div>;
  return (
    <button
      type="button"
      className={box}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(cell.date!)}
    >
      {number}
      <span className={`text-xs ${cell.missed ? 'text-shu' : 'text-koke'}`}>{cell.count}</span>
    </button>
  );
}

function LogRow({ log, tree }: { log: ReviewLog; tree: Tree | undefined }) {
  const { t } = useI18n();
  const result = (
    <div className="mt-0.5 font-gothic text-xs text-usuzumi">{describeResult(t, log)}</div>
  );
  // The log outlives its tree: deleting a tree does not change the fact that it was reviewed
  if (!tree) {
    return (
      <li className="border-b border-rule py-3">
        <div className="font-gothic text-sm text-usuzumi">{t.history.deletedTree}</div>
        {result}
      </li>
    );
  }
  return (
    <li className="border-b border-rule">
      <button
        type="button"
        className="w-full py-3 text-left"
        onClick={() => navigate({ name: 'view', id: tree.id })}
      >
        <TreePath tree={tree} />
        <div className="font-mincho text-[17px] leading-[1.6] text-sumi">
          {plainText(tree.root.text)}
        </div>
        {result}
      </button>
    </li>
  );
}

interface Props {
  logs: ReviewLog[];
  trees: Tree[];
  today: string;
}

export function HistoryScreen({ logs, trees, today }: Props) {
  const { lang, t } = useI18n();
  const [shown, setShown] = useState<YearMonth>(() => monthOf(today));
  const [selected, setSelected] = useState<string | null>(null);

  const weeks = useMemo(() => buildMonth(logs, shown.year, shown.month), [logs, shown]);
  const monthCount = useMemo(() => logsInMonth(logs, shown).length, [logs, shown]);
  const dayLogs = useMemo(() => (selected ? logsOn(logs, selected) : []), [logs, selected]);
  const treeById = useMemo(() => new Map(trees.map((tree) => [tree.id, tree])), [trees]);

  const move = (delta: number) => {
    setShown(addMonths(shown, delta));
    // The list under the grid belongs to a day of the month that was on screen
    setSelected(null);
  };

  const dayLabel = (date: string, count: number) =>
    t.history.dayReviews(formatShortDate(date, today, lang), count);

  return (
    <div>
      <Button kind="text" className="mb-2" onClick={() => navigate({ name: 'home' })}>
        {t.common.back}
      </Button>
      <h1 className="font-mincho text-[20px] leading-[1.6] text-sumi">{t.history.title}</h1>

      <div className="mt-4 flex items-center justify-between">
        <Button kind="text" disabled={!canGoPrev(shown, logs)} onClick={() => move(-1)}>
          {t.history.prevMonth}
        </Button>
        <h2 className="font-gothic text-sm text-sumi">
          {t.history.monthLabel(shown.year, shown.month)}
        </h2>
        <Button kind="text" disabled={!canGoNext(shown, today)} onClick={() => move(1)}>
          {t.history.nextMonth}
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1">
        {t.history.weekdays.map((weekday, index) => (
          <div key={index} className="pb-1 text-center font-gothic text-xs text-usuzumi">
            {weekday}
          </div>
        ))}
        {weeks.flat().map((cell, index) => (
          <Day
            key={cell.date ?? `pad-${index}`}
            cell={cell}
            isToday={cell.date === today}
            selected={cell.date !== null && cell.date === selected}
            label={cell.date === null ? '' : dayLabel(cell.date, cell.count)}
            onSelect={setSelected}
          />
        ))}
      </div>

      {monthCount > 0 && (
        <p className="mt-4 font-gothic text-xs text-usuzumi">
          {t.history.monthSummary(monthCount)}
        </p>
      )}

      {selected !== null && dayLogs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 font-gothic text-sm text-sumi">
            {dayLabel(selected, dayLogs.length)}
          </h2>
          <ul>
            {dayLogs.map((log) => (
              <LogRow key={log.id} log={log} tree={treeById.get(log.treeId)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
