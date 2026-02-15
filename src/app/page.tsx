"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

  // Auto-focus input when coming from results page
  // Note: focusing the input triggers onFocus which sets open to true
  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [shouldFocus]);

  // Load routes on mount
  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRoutes(data);
      })
      .catch(() => {});
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch stops for a route
  const fetchRouteStops = useCallback(async (routeTag: string): Promise<{ directions: Direction[]; stops: Stop[] }> => {
    const cached = routeStopsCache.get(routeTag);
    if (cached) return cached;

    try {
      const res = await fetch(`/api/stops?route=${encodeURIComponent(routeTag)}`);
      const data = await res.json();
      const result = {
        directions: data.directions || [],
        stops: [] as Stop[],
      };

      // Fetch stops for all directions
      if (data.directions?.length > 0) {
        const allStops: Stop[] = [];
        for (const dir of data.directions) {
          const dirRes = await fetch(`/api/stops?route=${encodeURIComponent(routeTag)}&direction=${encodeURIComponent(dir.tag)}`);
          const dirData = await dirRes.json();
          if (dirData.stops) {
            dirData.stops.forEach((stop: Stop) => {
              if (!allStops.find(s => s.tag === stop.tag)) {
                allStops.push(stop);
              }
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

  // Perform search when query changes
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const queryWords = q.split(/\s+/);

    // First, check if any word matches a route number/name
    const matchedRoutes = routes.filter((r) =>
      queryWords.some(word =>
        r.tag.toLowerCase().includes(word) ||
        r.title.toLowerCase().includes(word)
      )
    ).slice(0, 5);

    // Also search in already cached stops
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

    // If we have cached results, show them immediately
    if (cachedResults.length > 0) {
      setSearchResults(cachedResults);
    }

    // If no routes matched, just use cached results
    if (matchedRoutes.length === 0) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const allResults = await Promise.all(
      matchedRoutes.map(async (route) => {
        const routeResults: SearchResult[] = [];

        // Fetch stops for this route
        const data = await fetchRouteStops(route.tag);

        // Filter stops where all query words appear in route+stop combined
        const matchingStops = data.stops.filter((stop) => {
          const combined = `${route.title} ${stop.title}`.toLowerCase();
          return queryWords.every(word => combined.includes(word));
        });

        // If query matches stops, show those; otherwise show first stops
        const stopsToShow = matchingStops.length > 0
          ? matchingStops.slice(0, 15)
          : data.stops.slice(0, 5);

        stopsToShow.forEach((stop) => {
          routeResults.push({
            type: "stop",
            routeTag: route.tag,
            routeTitle: route.title,
            stopTag: stop.tag,
            stopTitle: stop.title,
            display: `${route.title} • ${stop.title}`,
          });
        });

        return routeResults;
      })
    );

    const flattened = allResults.flat();
    setSearchResults(flattened);
    setIsSearching(false);
  }, [routes, fetchRouteStops, routeStopsCache]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  // Compute display results based on query
  const displayResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchResults;
  }, [query, searchResults]);

  const showLoading = isSearching && displayResults.length === 0;

  function handleSelect(result: SearchResult) {
    if (result.type === "stop" && result.stopTag) {
      const params = new URLSearchParams({
        route: result.routeTag,
        stop: result.stopTag,
      });
      router.push(`/results?${params.toString()}`);
    } else {
      // Just a route selected, expand to show route info
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
    <div className="flex flex-col min-h-screen">
      {/* Black header - 74px */}
      <div className="h-[74px] bg-black" />

      <div className="flex-1 flex flex-col bg-ttc-red px-[16px] pt-[42px]">
        {/* Search input */}
        <div className="w-full" ref={containerRef}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search routes or stops..."
              className="w-full h-[61px] bg-white/20 border border-white/30 px-[24px] rounded-[56px] text-white text-[16px] font-semibold placeholder:text-white/50 focus:outline-none focus:bg-white/25 focus:border-white/40 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white"
                aria-label="Clear search"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {open && query && (displayResults.length > 0 || showLoading) && (
            <div className="mt-[12px] bg-white rounded-[28px] overflow-hidden shadow-lg max-h-[60vh] overflow-y-auto px-[16px] py-[24px]">
              {showLoading && (
                <div className="text-[14px] font-semibold text-muted">
                  Loading...
                </div>
              )}
              {displayResults.map((result, i) => (
                <button
                  key={`${result.routeTag}-${result.stopTag || "route"}-${i}`}
                  type="button"
                  className="w-full text-left py-[12px] text-[14px] font-semibold text-black hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                  onClick={() => handleSelect(result)}
                >
                  {result.display}
                </button>
              ))}
            </div>
          )}
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
