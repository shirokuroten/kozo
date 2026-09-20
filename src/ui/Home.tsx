import { useEffect, useMemo, useState } from 'react';
import { repository } from '../data';
import { buildShelf, searchTrees } from '../domain/shelf';
import { partitionByDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { HomeSync } from './HomeSync';
import { useI18n, type Lang } from './i18n';
import { Note } from './Note';
import { navigate } from './route';
import { Shelf } from './Shelf';
import { TreeRow } from './TreeRow';

// The nodes that matched the query, shown under each search result row. Too many would make the list unreadable
const MAX_MATCHES = 4;

// Each language is named in itself, so a reader who cannot read the current one can still find theirs
const LANGS: { code: Lang; label: string }[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];

interface Props {
  trees: Tree[];
  // The history entry stays hidden until there is something to show
  hasHistory: boolean;
  today: string;
  onChanged: () => Promise<void>;
}

// The shelf (document > tab > heading > tree) is the centerpiece of the list.
// Due trees are reported only as a count, and their list lives on a separate screen. Even a user who does not open the app every day should not feel chased by piled-up due trees
export function Home({ trees, hasHistory, today, onChanged }: Props) {
  const { lang, setLang, t } = useI18n();
  const [query, setQuery] = useState('');
  const [docOrder, setDocOrder] = useState<string[]>([]);
  const shelf = useMemo(() => buildShelf(trees, docOrder), [trees, docOrder]);
  const hits = useMemo(() => searchTrees(trees, query), [trees, query]);
  const dueCount = useMemo(() => partitionByDue(trees, today).dueToday.length, [trees, today]);
  const searching = query.trim() !== '';

  // Documents are ordered by when they were linked. A sync can add a document, so reload whenever the trees change
  useEffect(() => {
    void repository.listLinkedDocs().then((docs) => setDocOrder(docs.map((d) => d.docId)));
  }, [trees]);

  return (
    <div>
      <h1 className="font-mincho text-[26px] tracking-[1px] text-sumi">Outline Recall</h1>
      <p className="mt-1 mb-6 font-gothic text-sm text-usuzumi">{t.home.subtitle}</p>

      <HomeSync onChanged={onChanged} />

      {trees.length === 0 ? (
        <p className="mb-4 font-mincho text-base text-sumi">{t.home.noTrees}</p>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.home.search}
            aria-label={t.home.search}
            autoCapitalize="off"
            spellCheck={false}
            className="mb-4 w-full rounded border border-rule bg-surface px-3 py-2 font-gothic text-base text-sumi placeholder:text-usuzumi"
          />

          {searching ? (
            <section className="mb-6">
              <Note>{t.home.found(hits.length)}</Note>
              <ul>
                {hits.map(({ tree, matches }) => (
                  <TreeRow key={tree.id} tree={tree} today={today} showPath>
                    {matches.slice(0, MAX_MATCHES).map((match, index) => (
                      <div key={index} className="mt-1 font-mincho text-sm leading-[1.6] text-sumi">
                        {match.join(' / ')}
                      </div>
                    ))}
                    {matches.length > MAX_MATCHES && (
                      <div className="mt-1 font-gothic text-xs text-usuzumi">
                        {t.home.moreNodes(matches.length - MAX_MATCHES)}
                      </div>
                    )}
                  </TreeRow>
                ))}
              </ul>
            </section>
          ) : (
            <section className="mb-6">
              {(dueCount > 0 || hasHistory) && (
                <div className="mb-2 flex flex-wrap gap-x-4">
                  {dueCount > 0 && (
                    <Button kind="text" onClick={() => navigate({ name: 'due' })}>
                      {t.home.dueCount(dueCount)}
                    </Button>
                  )}
                  {hasHistory && (
                    <Button kind="text" onClick={() => navigate({ name: 'history' })}>
                      {t.history.title}
                    </Button>
                  )}
                </div>
              )}
              <Shelf shelf={shelf} today={today} />
            </section>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button kind="solid" onClick={() => navigate({ name: 'new' })}>
          {t.home.newTree}
        </Button>
        <Button kind="text" onClick={() => navigate({ name: 'data' })}>
          {t.home.data}
        </Button>
      </div>

      <div className="mt-6 flex gap-x-4">
        {LANGS.map(({ code, label }) => (
          <Button
            key={code}
            kind="text"
            aria-pressed={lang === code}
            // The text button sets usuzumi itself, so the current language needs the important form to win
            className={lang === code ? 'text-sumi!' : ''}
            onClick={() => setLang(code)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
