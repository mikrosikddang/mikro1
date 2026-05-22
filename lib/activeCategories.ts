export type ActiveCategoryTree = Record<string, Record<string, string[]>>;

type CategoryRow = {
  categoryMain: string | null;
  categoryMid: string | null;
  categorySub: string | null;
};

export function buildActiveCategoryTree(rows: CategoryRow[]) {
  const tree: ActiveCategoryTree = {};

  for (const row of rows) {
    const main = row.categoryMain?.trim();
    const mid = row.categoryMid?.trim();
    const sub = row.categorySub?.trim();

    if (!main) continue;

    tree[main] ??= {};
    if (!mid) continue;

    tree[main][mid] ??= [];
    if (sub && !tree[main][mid].includes(sub)) {
      tree[main][mid].push(sub);
    }
  }

  return tree;
}

export function hasActiveMain(
  tree: ActiveCategoryTree | undefined,
  main: string,
) {
  return !tree || Boolean(tree[main]);
}

export function hasActiveMid(
  tree: ActiveCategoryTree | undefined,
  main: string,
  mid: string,
) {
  return !tree || Boolean(tree[main]?.[mid]);
}

export function hasActiveSub(
  tree: ActiveCategoryTree | undefined,
  main: string,
  mid: string,
  sub: string,
) {
  return !tree || Boolean(tree[main]?.[mid]?.includes(sub));
}
