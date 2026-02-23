"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Favourite {
  routeTag: string;
  stopTag: string;
  display: string;
}

const STORAGE_KEY = "soon-come-favourites";

function loadFavourites(): Favourite[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveFavourites(favs: Favourite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

function FilledStarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 50 50" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round">
      <polygon points="25,6 30.5,18.5 44,19.5 34,28.5 37,42 25,35 13,42 16,28.5 6,19.5 19.5,18.5" />
    </svg>
  );
}

interface Route {
  tag: string;
  title: string;
}

interface Stop {
  tag: string;
  title: string;
}

interface Direction {
  tag: string;
  title: string;
}

interface SearchResult {
  type: "route" | "stop";
  routeTag: string;
  routeTitle: string;
  stopTag?: string;
  stopTitle?: string;
  display: string;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldFocus = searchParams.get("focus") === "true";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeStopsCache, setRouteStopsCache] = useState<Map<string, { directions: Direction[]; stops: Stop[] }>>(new Map());
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [favourites, setFavourites] = useState<Favourite[]>(() =>
    typeof window !== "undefined" ? loadFavourites() : []
  );

  function removeFavourite(routeTag: string, stopTag: string) {
    const updated = favourites.filter(f => !(f.routeTag === routeTag && f.stopTag === stopTag));
    saveFavourites(updated);
    setFavourites(updated);
  }

  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [shouldFocus]);

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRoutes(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRouteStops = useCallback(async (routeTag: string): Promise<{ directions: Direction[]; stops: Stop[] }> => {
    const cached = routeStopsCache.get(routeTag);
    if (cached) return cached;

    try {
      const res = await fetch(`/api/stops?route=${encodeURIComponent(routeTag)}`);
      const data = await res.json();
      const result = { directions: data.directions || [], stops: [] as Stop[] };

      if (data.directions?.length > 0) {
        const allStops: Stop[] = [];
        for (const dir of data.directions) {
          const dirRes = await fetch(`/api/stops?route=${encodeURIComponent(routeTag)}&direction=${encodeURIComponent(dir.tag)}`);
          const dirData = await dirRes.json();
          if (dirData.stops) {
            dirData.stops.forEach((stop: Stop) => {
              if (!allStops.find(s => s.tag === stop.tag)) allStops.push(stop);
            });
          }
        }
        result.stops = allStops;
      }

      setRouteStopsCache(prev => new Map(prev).set(routeTag, result));
      return result;
    } catch {
      return { directions: [], stops: [] };
    }
  }, [routeStopsCache]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const queryWords = q.split(/\s+/);

    const matchedRoutes = routes.filter((r) =>
      queryWords.some(word => r.tag.toLowerCase().includes(word) || r.title.toLowerCase().includes(word))
    ).slice(0, 5);

    const cachedResults: SearchResult[] = [];
    routeStopsCache.forEach((data, routeTag) => {
      const route = routes.find(r => r.tag === routeTag);
      if (!route) return;
      const matchingStops = data.stops.filter((stop) => {
        const combined = `${route.title} ${stop.title}`.toLowerCase();
        return queryWords.every(word => combined.includes(word));
      });
      matchingStops.slice(0, 10).forEach((stop) => {
        cachedResults.push({
          type: "stop",
          routeTag: route.tag,
          routeTitle: route.title,
          stopTag: stop.tag,
          stopTitle: stop.title,
          display: `${route.title} • ${stop.title}`,
        });
      });
    });

    if (cachedResults.length > 0) setSearchResults(cachedResults);
    if (matchedRoutes.length === 0) { setIsSearching(false); return; }

    setIsSearching(true);

    const allResults = await Promise.all(
      matchedRoutes.map(async (route) => {
        const data = await fetchRouteStops(route.tag);
        const matchingStops = data.stops.filter((stop) => {
          const combined = `${route.title} ${stop.title}`.toLowerCase();
          return queryWords.every(word => combined.includes(word));
        });
        const stopsToShow = matchingStops.length > 0 ? matchingStops.slice(0, 15) : data.stops.slice(0, 5);
        return stopsToShow.map((stop) => ({
          type: "stop" as const,
          routeTag: route.tag,
          routeTitle: route.title,
          stopTag: stop.tag,
          stopTitle: stop.title,
          display: `${route.title} • ${stop.title}`,
        }));
      })
    );

    setSearchResults(allResults.flat());
    setIsSearching(false);
  }, [routes, fetchRouteStops, routeStopsCache]);

  useEffect(() => {
    const timeoutId = setTimeout(() => performSearch(query), 150);
    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const displayResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchResults;
  }, [query, searchResults]);

  const showLoading = isSearching && displayResults.length === 0;

  function handleSelect(result: SearchResult) {
    if (result.type === "stop" && result.stopTag) {
      router.push(`/results?${new URLSearchParams({ route: result.routeTag, stop: result.stopTag })}`);
    } else {
      setQuery(result.routeTitle);
    }
    setOpen(false);
  }

  function handleClear() {
    setQuery("");
    setSearchResults([]);
    inputRef.current?.focus();
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header — 118px, "Soon / Come" stacked, left-aligned */}
      <div className="h-[118px] bg-black shrink-0 flex items-start pt-[24px] px-[16px]">
        <div className="font-extrabold text-white text-[20px] tracking-[-0.4px] leading-none">
          <p>Soon</p>
          <p>Come</p>
        </div>
      </div>

      {/* Content — black, input + dropdown pinned to bottom, pb accounts for iOS safe area */}
      <div className="flex-[1_0_0] min-h-0 bg-black flex flex-col justify-end px-[16px] pt-[24px] pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-[24px] w-full" ref={containerRef}>

          {/* Favourites card — shown when no search query */}
          {!query && favourites.length > 0 && (
            <div className="bg-[rgba(106,114,130,0.3)] rounded-[16px] overflow-hidden px-[16px] py-[16px] flex flex-col gap-[20px]">
              {favourites.map((fav, i) => (
                <div key={`${fav.routeTag}-${fav.stopTag}`}>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => router.push(`/results?${new URLSearchParams({ route: fav.routeTag, stop: fav.stopTag })}`)}
                    >
                      <p className="font-medium text-[16px] text-white uppercase tracking-[-0.16px] leading-[1.3]">
                        {fav.display}
                      </p>
                    </button>
                    <button
                      type="button"
                      aria-label="Remove saved stop"
                      onClick={() => removeFavourite(fav.routeTag, fav.stopTag)}
                      className="shrink-0 pl-[12px] opacity-80 hover:opacity-100"
                    >
                      <FilledStarIcon />
                    </button>
                  </div>
                  {i < favourites.length - 1 && (
                    <div className="h-px bg-white/20 mt-[20px]" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Autocomplete results card — floats above input */}
          {open && query && (displayResults.length > 0 || showLoading) && (
            <div className="bg-[rgba(106,114,130,0.3)] rounded-[16px] overflow-hidden max-h-[50vh] overflow-y-auto px-[16px] py-[16px] flex flex-col gap-[20px]">
              {showLoading && (
                <p className="font-medium text-[16px] text-white/60 tracking-[-0.16px] uppercase">
                  Loading...
                </p>
              )}
              {displayResults.map((result, i) => (
                <div key={`${result.routeTag}-${result.stopTag || "route"}-${i}`}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => handleSelect(result)}
                  >
                    <p className="font-medium text-[16px] text-white uppercase tracking-[-0.16px] leading-[1.3] w-full">
                      {result.display}
                    </p>
                  </button>
                  {i < displayResults.length - 1 && (
                    <div className="h-px bg-white/20 mt-[20px]" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Search input — pinned to bottom */}
          <div className="relative shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search routes or stops..."
              className="w-full h-[61px] bg-[rgba(255,255,255,0.15)] px-[24px] rounded-[56px] text-white text-[16px] font-medium tracking-[-0.16px] uppercase placeholder:text-white/40 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white"
                aria-label="Clear search"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
