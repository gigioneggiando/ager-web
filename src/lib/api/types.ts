export type Cursor = number | null;

// Governance enums mirror the MySQL ENUM values in ager_v1.sql.
export type LicenseType =
  | "link_only"
  | "cc_by"
  | "cc_by_sa"
  | "cc_by_nc"
  | "public_domain"
  | "agency_syndicated";

export type DisplayMode = "redirect" | "webview" | "reader_optin";

export type TakedownStatus =
  | "active"
  | "takedown_requested"
  | "takedown_done"
  | "disputed";

export type SourceKind = "RSS" | "MANUAL" | "API" | "AGENCY";

export type LicensingStatus =
  | "licensed_direct"
  | "licensed_via_agency"
  | "rss_permissive"
  | "rss_silent"
  | "rss_restrictive"
  | "no_agreement_linking_only"
  | "opted_out";

export type TdmOptoutMechanism = "robots" | "meta_tag" | "tdmrep_json" | "ai_txt" | "tos";

export type NegotiationStatus = "none" | "initiated" | "in_progress" | "agreed" | "declined";

/** Public source projection. Governance internals are never returned on this shape. */
export type Source = {
  sourceId: number;
  name: string;
  country?: string | null;
  lang?: string | null;
  url: string;
};

/** Admin-only source projection — includes every governance field. */
export type SourceAdmin = {
  sourceId: number;
  type: SourceKind;
  name: string;
  url: string;
  rssUrl?: string | null;
  country?: string | null;
  lang?: string | null;
  enabled: boolean;
  tosUrl?: string | null;
  tosLastCheckedAt?: string | null;
  tosHashLast?: string | null;
  licensingStatus: LicensingStatus;
  licenseExpiresAt?: string | null;
  tdmOptoutPresent: boolean;
  tdmOptoutMechanism?: TdmOptoutMechanism | null;
  imageHotlinkAllowed: boolean;
  publisherContactEmail?: string | null;
  negotiationStatus: NegotiationStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceAdminUpdate = {
  licensingStatus?: LicensingStatus;
  licenseExpiresAt?: string | null;
  publisherContactEmail?: string | null;
  negotiationStatus?: NegotiationStatus;
  notes?: string | null;
  imageHotlinkAllowed?: boolean;
};

export type RequesterRole = "publisher" | "author" | "third_party" | "anonymous";

export type TakedownAction = "none" | "removed" | "disputed" | "referred";

export type TakedownRequestInput = {
  articleId?: number | null;
  sourceId?: number | null;
  requesterEmail: string;
  requesterRole: RequesterRole;
  reason: string;
  honeypot?: string;
};

export type TakedownRequestAdmin = {
  requestId: number;
  articleId: number | null;
  articleTitle: string | null;
  articleUrl: string | null;
  articleTakedownStatus: TakedownStatus | null;
  sourceId: number | null;
  sourceName: string | null;
  sourceLicensingStatus: LicensingStatus | null;
  requesterEmail: string;
  requesterRole: RequesterRole;
  reason: string;
  receivedAt: string;
  respondedAt: string | null;
  actionTaken: TakedownAction;
  responseNotes: string | null;
  isPending: boolean;
};

export type TakedownRequestAdminUpdate = {
  actionTaken: TakedownAction;
  responseNotes?: string | null;
};

export type IngestionLogAdmin = {
  logId: number;
  sourceId: number;
  sourceName: string | null;
  fetchedAt: string;
  robotsTxtHash: string | null;
  tdmrepJsonPresent: boolean;
  tdmrepJsonHash: string | null;
  aiTxtPresent: boolean;
  aiTxtHash: string | null;
  articlesIngested: number;
  articlesSkipped: number;
  errors: string | null;
};

export type IngestionLogStatsPoint = {
  day: string;
  sourceId: number;
  sourceName: string | null;
  articlesIngested: number;
  articlesSkipped: number;
  runsWithErrors: number;
};

export type IngestionLogStatsResponse = {
  windowDays: number;
  from: string;
  to: string;
  points: IngestionLogStatsPoint[];
};

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
  licenseType: LicenseType;
  displayMode: DisplayMode;
  paywallDetected: boolean;
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
  imageUrl: string | null;
  author: string | null;
  lang: string;
  publishedAt: string;
  sourceName: string;
  topics: string[] | null;
  estimatedReadingMinutes: number | null;
  licenseType: LicenseType;
  displayMode: DisplayMode;
  paywallDetected: boolean;
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
  licenseType?: LicenseType | null;
  displayMode?: DisplayMode | null;
  paywallDetected?: boolean;
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
