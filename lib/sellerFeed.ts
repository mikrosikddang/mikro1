import { prisma } from "@/lib/prisma";
import { getCustomerVisibleProductWhere } from "@/lib/publicVisibility";
import { getArchiveCaptionBody } from "@/lib/archiveCaption";

// Seller intermediate feed (Instagram-style vertical feed for one seller).
//
// Windowing strategy (approved as "A2"): fetch the seller's full ordered id list
// (id-only select), locate the anchor/cursor by index, then slice a bounded window.
// This makes the feed order match the shop grid 100% (same orderBy) and eliminates
// bidirectional keyset edge cases for free.
//
// TRADE-OFF: this loads all visible product ids for the seller on every request.
// Fine at the current scale (tens–hundreds of posts per brand). If a seller ever
// reaches multiple thousands of posts, switch to a composite keyset cursor
// ((sortOrder, createdAt, id) tuple) instead of the full id list.

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const BEFORE_ANCHOR = 5; // how many prior posts to include around an anchor

export type SellerFeedItem = {
  id: string;
  title: string;
  postType: "SALE" | "ARCHIVE";
  priceKrw: number;
  salePriceKrw: number | null;
  images: { url: string }[];
  captionBody: string;
};

export type SellerFeedResult = {
  items: SellerFeedItem[];
  prevCursor: string | null; // id of the item BEFORE the window (for upward paging)
  nextCursor: string | null; // id of the item AFTER the window (for downward paging)
  anchorFound: boolean;
};

function clampLimit(raw: number | null | undefined): number {
  const n = typeof raw === "number" && Number.isFinite(raw) ? raw : DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(n)), MAX_LIMIT);
}

// Fetch the ordered id list for a seller using the exact grid order + customer visibility.
async function getOrderedIds(sellerId: string): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: getCustomerVisibleProductWhere({ sellerId }),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

// Hydrate a slice of ids into feed items, preserving the id order.
async function hydrate(ids: string[]): Promise<SellerFeedItem[]> {
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: {
      images: {
        where: { kind: "MAIN" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: SellerFeedItem[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (!p) continue; // dropped between the two queries — skip defensively
    items.push({
      id: p.id,
      title: p.title,
      postType: p.postType as "SALE" | "ARCHIVE",
      priceKrw: p.priceKrw,
      salePriceKrw: p.salePriceKrw,
      images: p.images.map((i) => ({ url: i.url })),
      captionBody: getArchiveCaptionBody(p.descriptionJson, p.description),
    });
  }
  return items;
}

export type SellerFeedQuery = {
  sellerId: string;
  anchor?: string | null;
  cursor?: string | null;
  direction?: "before" | "after" | null;
  limit?: number | null;
};

export async function getSellerFeedWindow(query: SellerFeedQuery): Promise<SellerFeedResult> {
  const { sellerId } = query;
  const limit = clampLimit(query.limit);
  const orderedIds = await getOrderedIds(sellerId);
  const total = orderedIds.length;

  if (total === 0) {
    return { items: [], prevCursor: null, nextCursor: null, anchorFound: false };
  }

  // Directional pagination: continue from an existing boundary cursor.
  if (query.cursor && (query.direction === "before" || query.direction === "after")) {
    const cursorIdx = orderedIds.indexOf(query.cursor);
    if (cursorIdx === -1) {
      // Cursor no longer visible — nothing more in that direction.
      return { items: [], prevCursor: null, nextCursor: null, anchorFound: true };
    }
    let start: number;
    let end: number; // exclusive
    if (query.direction === "after") {
      start = cursorIdx + 1;
      end = Math.min(total, start + limit);
    } else {
      end = cursorIdx;
      start = Math.max(0, end - limit);
    }
    const sliceIds = orderedIds.slice(start, end);
    const items = await hydrate(sliceIds);
    // Cursor semantics: cursor = LAST shown boundary item; next fetch excludes it.
    // prevCursor = first shown item (null if window reaches the top).
    // nextCursor = last shown item (null if window reaches the bottom).
    return {
      items,
      prevCursor: start > 0 ? orderedIds[start] : null,
      nextCursor: end < total ? orderedIds[end - 1] : null,
      anchorFound: true,
    };
  }

  // Initial load: center the window on the anchor (탭한 게시물).
  let anchorIdx = query.anchor ? orderedIds.indexOf(query.anchor) : -1;
  const anchorFound = anchorIdx !== -1;
  if (anchorIdx === -1) anchorIdx = 0; // anchor missing/hidden → start from the top

  const start = Math.max(0, anchorIdx - BEFORE_ANCHOR);
  const end = Math.min(total, anchorIdx + limit + 1); // anchor + `limit` after
  const sliceIds = orderedIds.slice(start, end);
  const items = await hydrate(sliceIds);

  // Cursor = LAST shown boundary item (not the unseen next item) so directional
  // paging (which excludes the cursor) doesn't skip the boundary item.
  return {
    items,
    prevCursor: start > 0 ? orderedIds[start] : null,
    nextCursor: end < total ? orderedIds[end - 1] : null,
    anchorFound,
  };
}
