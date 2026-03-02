"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";

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

interface Departure {
  minutes: number;
  type: "live" | "delayed" | "estimate";
}

interface Result {
  stopName: string;
  direction: string;
  soonCome: boolean;
  departures: Departure[];
}

interface FetchState {
  results: Result[];
  status: "idle" | "loading" | "success" | "error";
  error: string;
}

const POSITIVE_MESSAGES = [
  "Today is your day.",
  "Oh, it's coming!",
  "Skip the coffee. Catch your ride.",
  "The universe is in your favour.",
  "It's all happening.",
  "Definitely, maybe.",
];

const NEGATIVE_MESSAGES = [
  "Grab a coffee maybe.",
  "Unscheduled mindfulness.",
  "A walk never hurt anyone.",
  "It's your time, just not now.",
  "Call a friend and say hi.",
];

function statusLabel(dep: Departure): string {
  if (dep.type === "live") return "LIVE";
  if (dep.type === "delayed") return "HOLDING";
  return "UNCONFIRMED";
}

function statusColor(dep: Departure): string {
  if (dep.type === "live") return "#00c950";
  if (dep.type === "delayed") return "#ef3340";
  return "#f27c18";
}

function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "black" : "none"} stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v13" />
      <path d="M8 6l4-4 4 4" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

// Snappy spring-like easing matching the Lottie reference
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function ResultsContent() {
  const searchParams = useSearchParams();
  const route = searchParams.get("route") ?? "";
  const stop = searchParams.get("stop") ?? "";

  const [fetchState, setFetchState] = useState<FetchState>({
    results: [],
    status: "idle",
    error: "",
  });

  const [message, setMessage] = useState<string>("");
  const messagePickedRef = useRef(false);
  const [isFavourited, setIsFavourited] = useState(() => {
    if (typeof window === "undefined") return false;
    const favs = loadFavourites();
    return favs.some(f => f.routeTag === route && f.stopTag === stop);
  });

  function toggleFavourite() {
    const favs = loadFavourites();
    if (isFavourited) {
      saveFavourites(favs.filter(f => !(f.routeTag === route && f.stopTag === stop)));
      setIsFavourited(false);
    } else if (activeResult) {
      saveFavourites([...favs, {
        routeTag: route,
        stopTag: stop,
        display: `${route} • ${activeResult.stopName}`,
      }]);
      setIsFavourited(true);
    }
  }

  async function handleShare() {
    const text = activeResult
      ? `${route} ${activeResult.direction} — ${activeResult.stopName}`
      : "Soon Come? — Toronto Real-Time Transit";
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Soon Come?", text, url });
      } catch {
        // dismissed
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  const fetchPredictions = useCallback(async () => {
    if (!route) return;
    setFetchState(prev => ({ ...prev, status: "loading", error: "" }));
    const params = new URLSearchParams({ route });
    if (stop) params.set("stop", stop);
    try {
      const res = await fetch(`/api/predictions?${params}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to fetch");
      }
      const data = await res.json();
      setFetchState({ results: data.results, status: "success", error: "" });
    } catch (err) {
      setFetchState({
        results: [],
        status: "error",
        error: err instanceof Error ? err.message : "Failed to fetch predictions",
      });
    }
  }, [route, stop]);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  const { results, status, error: fetchError } = fetchState;
  const validationError = !route ? "No route specified" : "";
  const error = validationError || fetchError;
  const isLoading = status === "loading" || (status === "idle" && !!route);

  const activeResult = results[0];
  const activeDepartures = activeResult?.departures ?? [];
  const firstMinutes = activeDepartures[0]?.minutes;
  const soonCome = firstMinutes !== undefined && firstMinutes < 10;
  const displayDepartures = activeDepartures.slice(0, 3);

  // Pick message once when data arrives
  useEffect(() => {
    if (status === "success" && !messagePickedRef.current) {
      messagePickedRef.current = true;
      const list = soonCome ? POSITIVE_MESSAGES : NEGATIVE_MESSAGES;
      setMessage(list[Math.floor(Math.random() * list.length)]);
    }
  }, [status, soonCome]);

  return (
    <div
      className="flex-1 flex flex-col transition-colors duration-500"
      style={{ backgroundColor: soonCome && !isLoading && !error ? "#da251d" : "black" }}
    >
      {/* Header */}
      <div className="h-[118px] shrink-0 flex items-center justify-between pt-[48px] px-[16px]">
        <div className="font-extrabold text-white text-[20px] tracking-[-0.4px] leading-none">
          <p>Soon</p>
          <p>Come</p>
        </div>
        {activeResult && !isLoading && !error && (
          <div className="flex gap-[12px]">
            <button
              aria-label={isFavourited ? "Remove saved stop" : "Save stop"}
              onClick={toggleFavourite}
              className="size-[40px] bg-white rounded-[20px] flex items-center justify-center"
            >
              <BookmarkIcon filled={isFavourited} />
            </button>
            <button
              aria-label="Share"
              onClick={handleShare}
              className="size-[40px] bg-white rounded-[20px] flex items-center justify-center"
            >
              <ShareIcon />
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col px-[16px] gap-[24px] min-h-0 pb-[16px]">

        {/* Route + Stop info */}
        {activeResult && !isLoading && !error && (
          <div
            className="flex flex-col gap-[8px] shrink-0"
            style={{ animation: `slideUpFade 0.55s ${EASE} both` }}
          >
            <p className="font-extrabold text-white text-[20px] tracking-[-0.4px] leading-none">
              {route} {activeResult.direction}
            </p>
            <p className="font-extrabold text-white text-[32px] tracking-[-0.64px] leading-none">
              {activeResult.stopName}
            </p>
          </div>
        )}

        {/* Message card */}
        <div className="flex-1 bg-[rgba(0,0,0,0.9)] rounded-[36px] px-[24px] py-[28px] flex flex-col justify-end min-h-0">
          {isLoading && (
            <p className="font-extrabold text-[44px] leading-none tracking-[-0.88px] text-white/30">
              Loading...
            </p>
          )}
          {error && !isLoading && (
            <p className="font-extrabold text-[32px] leading-none tracking-[-0.64px] text-white uppercase">
              {error}
            </p>
          )}
          {message && !isLoading && !error && (
            <p
              className="font-extrabold text-[44px] leading-none tracking-[-0.88px]"
              style={{
                color: soonCome ? "#00c950" : "#ef3340",
                animation: `slideUpFade 0.55s ${EASE} both`,
              }}
            >
              {message}
            </p>
          )}
        </div>

        {/* Departure tiles */}
        {activeResult && !isLoading && !error && (
          <div className="flex gap-[12px] shrink-0">
            {displayDepartures.map((dep, i) => (
              <div
                key={i}
                className="flex-1 bg-black rounded-[24px] py-[16px] flex flex-col gap-[2px] items-center justify-center leading-none"
                style={{ animation: `slideUpFade 0.45s ${EASE} ${0.16 + i * 0.07}s both` }}
              >
                <p className="font-black text-[40px] text-white tracking-[-0.8px]">
                  {dep.minutes}
                </p>
                <div className="flex flex-col gap-[8px] items-center">
                  <p className="font-semibold text-[20px] text-white tracking-[-0.4px]">mins</p>
                  <p className="font-bold text-[13px] uppercase" style={{ color: statusColor(dep) }}>
                    {statusLabel(dep)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search bar */}
        <Link
          href="/?focus=true"
          className="flex shrink-0 h-[61px] px-[16px] gap-[8px] items-center bg-white rounded-[24px]"
        >
          <SearchIcon />
          <span className="font-semibold text-black text-[17px] tracking-[-0.34px] leading-none whitespace-nowrap">
            Search another route and stop
          </span>
        </Link>

        {/* Footer */}
        <p className="text-center font-medium text-white text-[16px] tracking-[-0.16px] underline shrink-0 pb-[max(0px,env(safe-area-inset-bottom))]">
          Built with love by Mom+Dad
        </p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
