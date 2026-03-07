export type Cursor = number | null;

export type FeedItem = {
  feedItemId: number;
  articleId: number;
  title: string;
  url: string;
  canonicalUrl: string;
  excerpt: string | null;
  imageUrl: string | null;
  author: string;
  wordCount: number;
  lang: string;
  publishedAt: string; // ISO
  score: number;
  sourceName: string;
  sourceType: string;
  topics: string[] | null;
  estimatedReadingMinutes: number;
};

export type FeedPage = {
  items: FeedItem[];
  nextCursor: Cursor; // null when no more
};

export type Article = {
  articleId: number;
  title: string;
  url: string;
  canonicalUrl: string | null;
  excerpt: string | null;
  content?: string | null;
  imageUrl: string | null;
  author: string | null;
  lang: string;
  publishedAt: string;
  sourceName: string;
  topics: string[] | null;
  estimatedReadingMinutes: number | null;
};

export type ArticlePage = Article; // alias for clarity

// 0 = Private, 1 = Shared (if you ever use it), 2 = Public
export type ReadingListVisibility = 0 | 1 | 2;

export type ReadingList = {
  id: number;
  ownerUserId: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility: ReadingListVisibility;
  allowCollaboration: boolean;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
};

export type ReadingListItem = {
  listId: number;
  articleId: number;

  // saved metadata
  addedAt: string;
  note?: string | null;

  // article preview
  title: string;
  url: string;
  canonicalUrl?: string | null;
  imageUrl?: string | null;
  author?: string | null;
  wordCount?: number | null;
  lang?: string | null;
  publishedAt?: string | null;
  topics?: string[] | null;
  sourceName?: string | null;
};

// Paged responses

export type ReadingListPage = {
  items: ReadingList[];
  nextCursor: string | null;
};

export type ReadingListItemsPage = {
  items: ReadingListItem[];
  nextCursor: string | null;
};
