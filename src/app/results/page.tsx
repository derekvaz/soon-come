"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, useCallback } from "react";
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

function ArrivalCard({ dep, index }: { dep: Departure; index: number }) {
  // Get status label for departure
  const status = dep.type === "live"
    ? { text: "LIVE", isLive: true }
    : { text: "scheduled", isLive: false };

  return (
    <div
      className="flex flex-col uppercase leading-none"
      style={{ opacity: 1, color: "#ffffff" }}
    >
      {/* Minutes number - 124px */}
      <span
        className="font-black"
        style={{ fontSize: "124px", letterSpacing: "-1.24px" }}
      >
        {dep.minutes}
      </span>

      {/* MIN/MINS and status grouped - 7px gap from number */}
      <div className="flex flex-col mt-[7px]">
        {/* MIN/MINS label - 44px */}
        <span
          className="font-bold"
          style={{ fontSize: "44px", letterSpacing: "-0.89px" }}
        >
          {dep.minutes === 1 ? "MIN" : "MINS"}
        </span>

        {/* Status - 27px, 4px gap from MIN */}
        <span
          className="font-semibold mt-[4px]"
          style={{ fontSize: "27px", letterSpacing: "-0.53px" }}
        >
          {status.text}
        </span>
      </div>
    </div>
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
  const [activeStopIndex, setActiveStopIndex] = useState(0);

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

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const { results, status, error: fetchError } = fetchState;

  const validationError = !route ? "No route specified" : "";
  const error = validationError || fetchError;
  const isLoading = status === "loading" || (status === "idle" && route);

  const activeResult = results[activeStopIndex] || results[0];
  const activeDepartures = activeResult?.departures || [];

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Black header - contains stop name */}
      <div className="bg-black shrink-0 z-10 pt-[123px] pb-[24px] px-[19px]">
        {isLoading && (
          <div className="text-white/80 text-[16px] font-semibold">
            Loading...
          </div>
        )}

        {error && !isLoading && (
          <div className="text-white text-[20px] font-bold uppercase">
            {error}
          </div>
        )}

        {activeResult && (
          <h2
            className="font-bold text-white uppercase"
            style={{ fontSize: "24px", lineHeight: "1.3", letterSpacing: "-0.24px" }}
          >
            {activeResult.stopName}
          </h2>
        )}
      </div>

      {/* Scrollable content area */}
      <div
        className="flex-1 bg-ttc-red overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>

        {/* Main content - arrivals start 35px from top of scroll area */}
        <main className="px-[19px] pt-[35px] pb-[120px]">
          {!isLoading && !error && activeDepartures.length === 0 && (
            <div className="text-white/80 text-[20px] font-bold uppercase">
              No predictions available
            </div>
          )}

          {/* Arrival times - stacked vertically with 24px gap */}
          <div className="flex flex-col gap-[24px]">
            {activeDepartures.map((dep, i) => (
              <ArrivalCard key={i} dep={dep} index={i} />
            ))}
          </div>
        </main>
      </div>

      {/* Bottom search bar - 61px height, 16px from edges */}
      <footer className="fixed bottom-0 left-0 right-0 px-[16px] py-[16px] max-w-[430px] mx-auto z-20">
        <Link
          href="/?focus=true"
          className="flex w-full h-[61px] bg-white/20 border border-white/30 px-[24px] rounded-[56px] items-center"
        >
          <span
            className="text-white font-medium uppercase truncate"
            style={{ fontSize: "16px", lineHeight: "1.3", letterSpacing: "-0.16px" }}
          >
            {route} {activeResult?.stopName ? `• ${activeResult.stopName}` : "Search routes or stops..."}
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
