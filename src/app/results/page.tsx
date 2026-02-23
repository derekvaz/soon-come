"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface Departure {
  minutes: number;
  type: "live" | "estimate";
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
  return dep.type === "live" ? "LIVE" : "scheduled";
}

function statusColor(dep: Departure): string {
  return dep.type === "live" ? "#02aa55" : "#f27c18";
}

function StarIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round">
      <polygon points="25,6 30.5,18.5 44,19.5 34,28.5 37,42 25,35 13,42 16,28.5 6,19.5 19.5,18.5" />
    </svg>
  );
}

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

  const searchBarLabel = activeResult
    ? `${route} • ${activeResult.direction} • ${activeResult.stopName}`
    : "Search routes or stops...";

  return (
    <div className="flex-1 flex flex-col bg-black">
      {/* Header — 118px, "Soon / Come" stacked, left-aligned */}
      <div className="h-[118px] bg-black shrink-0 flex items-start pt-[24px] px-[16px]">
        <div className="font-extrabold text-white text-[20px] tracking-[-0.4px] leading-none">
          <p>Soon</p>
          <p>Come</p>
        </div>
      </div>

      {/* Main content — message at top, stop info at bottom */}
      <div className="flex-[1_0_0] min-h-0 flex flex-col justify-between px-[16px] pt-[36px] pb-[120px]">

        {/* Rotating message */}
        <div>
          {isLoading && (
            <p className="font-extrabold text-[64px] leading-none tracking-[-1.28px] text-white/30">
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
              className="font-extrabold text-[64px] leading-none tracking-[-1.28px]"
              style={{ color: soonCome ? "#00c950" : "#da251d" }}
            >
              {message}
            </p>
          )}
        </div>

        {/* Stop info + departures */}
        {activeResult && !isLoading && !error && (
          <div className="flex flex-col gap-[24px]">
            {/* Divider */}
            <div className="h-px bg-white/20" />

            {/* Stop name + star */}
            <div className="flex items-start justify-between">
              <div className="font-extrabold text-white text-[20px] tracking-[-0.4px] leading-none flex flex-col gap-[6px]">
                <p>{route} {activeResult.direction}</p>
                <p>{activeResult.stopName}</p>
              </div>
              <button aria-label="Save stop" className="shrink-0 opacity-80 hover:opacity-100">
                <StarIcon />
              </button>
            </div>

            {/* Departure grid */}
            {soonCome ? (
              /* Soon — plain columns, no tile bg */
              <div className="flex items-start justify-between h-[81px]">
                {displayDepartures.map((dep, i) => (
                  <div key={i} className="flex-[1_0_0] flex flex-col h-full items-center justify-between leading-none">
                    <p className="font-black text-[40px] text-white tracking-[-0.8px]">
                      {dep.minutes}
                    </p>
                    <div className="flex flex-col gap-[2px] items-center">
                      <p className="font-normal text-[20px] text-white tracking-[-0.4px]">mins</p>
                      <p className="font-semibold text-[15px] tracking-[-0.3px] uppercase" style={{ color: statusColor(dep) }}>
                        {statusLabel(dep)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Later — muted tile cards */
              <div className="flex gap-[6px]">
                {displayDepartures.map((dep, i) => (
                  <div
                    key={i}
                    className="flex-[1_0_0] bg-[rgba(106,114,130,0.3)] rounded-[16px] py-[16px] flex flex-col gap-[8px] items-center justify-center leading-none"
                  >
                    <p className="font-black text-[40px] text-white tracking-[-0.8px]">
                      {dep.minutes}
                    </p>
                    <div className="flex flex-col gap-[2px] items-center">
                      <p className="font-normal text-[20px] text-white tracking-[-0.4px]">mins</p>
                      <p className="font-semibold text-[15px] tracking-[-0.3px] uppercase" style={{ color: statusColor(dep) }}>
                        {statusLabel(dep)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom search bar */}
      <footer className="fixed bottom-0 left-0 right-0 px-[16px] py-[16px] z-20">
        <Link
          href="/?focus=true"
          className={`flex w-full h-[61px] px-[24px] items-center ${
            soonCome
              ? "bg-white/20 rounded-[56px]"
              : "bg-[rgba(106,114,130,0.3)] rounded-[24px]"
          }`}
        >
          <span className="font-medium text-white text-[16px] tracking-[-0.16px] uppercase truncate leading-[1.3]">
            {searchBarLabel}
          </span>
        </Link>
      </footer>
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
