/*
 * Public /packages query contract (CR-029 Stage 3A).
 *
 * The browser URL uses public names only:
 *   ?destination=<text>  -> API destination (contains, case-insensitive)
 *   ?q=<text>            -> API title       (contains, titles only)
 *   ?sort=<key>          -> API sortBy + sortOrder, from an allow-list
 *
 * Only single string values are accepted, text is trimmed and
 * capped at 100 characters (the API's destination limit), and
 * anything else falls back to the default. Arbitrary API
 * parameters from the browser are never forwarded.
 */

export const MAX_SEARCH_LENGTH = 100;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest", summary: "", sortBy: "createdAt", sortOrder: "desc" },
  {
    value: "price-asc",
    label: "Price: low to high",
    summary: "price, low to high",
    sortBy: "price",
    sortOrder: "asc",
  },
  {
    value: "price-desc",
    label: "Price: high to low",
    summary: "price, high to low",
    sortBy: "price",
    sortOrder: "desc",
  },
  {
    value: "duration-asc",
    label: "Duration: shortest first",
    summary: "duration, shortest first",
    sortBy: "durationDays",
    sortOrder: "asc",
  },
] as const;

export type PackageSort = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: PackageSort = "newest";

export type PackageSearch = {
  destination: string;
  q: string;
  sort: PackageSort;
};

export type PackageApiQuery = {
  destination?: string;
  title?: string;
  sortBy: (typeof SORT_OPTIONS)[number]["sortBy"];
  sortOrder: (typeof SORT_OPTIONS)[number]["sortOrder"];
};

type RawSearchParams = { [key: string]: string | string[] | undefined };

/** A single trimmed, capped string; repeated or missing values become "". */
function readText(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim().slice(0, MAX_SEARCH_LENGTH) : "";
}

function readSort(value: string | string[] | undefined): PackageSort {
  const match = SORT_OPTIONS.find((option) => option.value === value);

  return match ? match.value : DEFAULT_SORT;
}

export function parsePackageSearch(searchParams: RawSearchParams): PackageSearch {
  return {
    destination: readText(searchParams.destination),
    q: readText(searchParams.q),
    sort: readSort(searchParams.sort),
  };
}

export function getSortOption(sort: PackageSort) {
  return SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0];
}

/** The only values ever sent to the packages API. */
export function toPackageApiQuery(search: PackageSearch): PackageApiQuery {
  const { sortBy, sortOrder } = getSortOption(search.sort);

  return {
    ...(search.destination ? { destination: search.destination } : {}),
    ...(search.q ? { title: search.q } : {}),
    sortBy,
    sortOrder,
  };
}

/** Canonical /packages URL: only non-empty values, default sort omitted. */
export function packagesHref(search: Partial<PackageSearch>) {
  const params = new URLSearchParams();

  if (search.destination) {
    params.set("destination", search.destination);
  }

  if (search.q) {
    params.set("q", search.q);
  }

  if (search.sort && search.sort !== DEFAULT_SORT) {
    params.set("sort", search.sort);
  }

  const query = params.toString();

  return query ? `/packages?${query}` : "/packages";
}

/**
 * Which /packages view to render (CR-029 Stage 3C): the results
 * grid, a "no matches" state for an active search, or the empty
 * catalogue (no active packages at all, so there is nothing to
 * search or sort and the discovery form steps aside).
 */
export function packagesListingState(shown: number, search: PackageSearch) {
  if (shown > 0) {
    return "results" as const;
  }

  return search.destination || search.q ? ("no-matches" as const) : ("empty-catalog" as const);
}

/**
 * Secondary result context (CR-029 Stage 3C). The listing shows
 * only the API's first page (CR-017 owns pagination), so say so
 * when more packages match: "Showing 10 of 14 packages". Null
 * when every matching package is already on the page.
 */
export function describeShownCount(shown: number, total: number) {
  if (shown <= 0 || total <= shown) {
    return null;
  }

  return `Showing ${shown} of ${total} packages`;
}

/**
 * True when the incoming URL is not already canonical (empty
 * fields from a GET form, untrimmed text, the default or an
 * invalid sort, repeated values, or unknown parameters).
 */
export function isCanonicalPackagesQuery(searchParams: RawSearchParams, search: PackageSearch) {
  const canonical = new URL(packagesHref(search), "http://local").searchParams;

  const keys = Object.keys(searchParams).filter((key) => searchParams[key] !== undefined);

  if (keys.length !== Array.from(canonical.keys()).length) {
    return false;
  }

  return keys.every((key) => searchParams[key] === canonical.get(key));
}

/**
 * The canonical /packages URL for an incoming query string, or
 * null when it is already canonical. src/proxy.ts uses this so
 * non-canonical URLs get a real redirect before the page renders;
 * repeated keys are read the way the page receives them (arrays).
 */
export function canonicalPackagesRedirect(params: URLSearchParams): string | null {
  const searchParams: RawSearchParams = {};

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);

    searchParams[key] = values.length > 1 ? values : values[0];
  }

  const search = parsePackageSearch(searchParams);

  return isCanonicalPackagesQuery(searchParams, search) ? null : packagesHref(search);
}
