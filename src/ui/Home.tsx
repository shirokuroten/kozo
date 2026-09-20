import { useEffect, useMemo, useState } from 'react';
import { repository } from '../data';
import { buildShelf, searchTrees } from '../domain/shelf';
import { partitionByDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { HomeSync } from './HomeSync';
import { Note } from './Note';
import { navigate } from './route';
import { Shelf } from './Shelf';
import { TreeRow } from './TreeRow';

// 検索結果の1行に添える、語が当たった節。多すぎると一覧が読めなくなる
const MAX_MATCHES = 4;

interface Props {
  trees: Tree[];
  today: string;
  onChanged: () => Promise<void>;
}

// 一覧の主役は棚（文書 > タブ > 見出し > 木）。
// 出番の木は数だけ知らせ、一覧は別の画面に置く。毎日は開かない使い方でも、たまった出番に追われないようにする
export function Home({ trees, today, onChanged }: Props) {
  const [query, setQuery] = useState('');
  const [docOrder, setDocOrder] = useState<string[]>([]);
  const shelf = useMemo(() => buildShelf(trees, docOrder), [trees, docOrder]);
  const hits = useMemo(() => searchTrees(trees, query), [trees, query]);
  const dueCount = useMemo(() => partitionByDue(trees, today).dueToday.length, [trees, today]);
  const searching = query.trim() !== '';

  // 文書どうしの並びは登録した順。同期で文書が増えることがあるので、木が変わるたびに読み直す
  useEffect(() => {
    void repository.listLinkedDocs().then((docs) => setDocOrder(docs.map((d) => d.docId)));
  }, [trees]);

  return (
    <div>
      <h1 className="font-mincho text-[26px] tracking-[2px] text-sumi">構造</h1>
      <p className="mt-1 mb-6 font-gothic text-sm text-usuzumi">
        木を上から展開して、自分で再現する
      </p>

      <HomeSync onChanged={onChanged} />

      {trees.length === 0 ? (
        <p className="mb-4 font-mincho text-base text-sumi">まだ木がない。最初の1本を作る</p>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="木をさがす"
            aria-label="木をさがす"
            autoCapitalize="off"
            spellCheck={false}
            className="mb-4 w-full rounded border border-rule bg-white px-3 py-2 font-gothic text-base text-sumi placeholder:text-usuzumi"
          />

          {searching ? (
            <section className="mb-6">
              <Note>{hits.length > 0 ? `${hits.length} 本の木にあった` : '見つからなかった'}</Note>
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
                        ほか {matches.length - MAX_MATCHES} 節
                      </div>
                    )}
                  </TreeRow>
                ))}
              </ul>
            </section>
          ) : (
            <section className="mb-6">
              {dueCount > 0 && (
                <Button kind="text" className="mb-2" onClick={() => navigate({ name: 'due' })}>
                  出番の木 {dueCount} 本
                </Button>
              )}
              <Shelf shelf={shelf} today={today} />
            </section>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button kind="solid" onClick={() => navigate({ name: 'new' })}>
          新しい木を作る
        </Button>
        <Button kind="text" onClick={() => navigate({ name: 'data' })}>
          取り込みとバックアップ
        </Button>
      </div>
    </div>
  );
}
