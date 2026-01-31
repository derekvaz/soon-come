"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ArrivalCard from "@/components/ArrivalCard";
import Footer from "@/components/Footer";

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

function ResultsContent() {
  const searchParams = useSearchParams();
  const route = searchParams.get("route") ?? "";
  const stop = searchParams.get("stop") ?? "";

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!route) {
      setLoading(false);
      setError("No route specified");
      return;
    }

    const params = new URLSearchParams({ route });
    if (stop) params.set("stop", stop);

    fetch(`/api/predictions?${params}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d.error));
        return res.json();
      })
      .then((data) => {
        setResults(data.results);
        setLoading(false);
      })
      .catch((err) => {
        setError(typeof err === "string" ? err : "Failed to fetch predictions");
        setLoading(false);
      });
  }, [route, stop]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Back header */}
      <header className="bg-black px-4 py-6">
        <Link href="/" className="flex items-center gap-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-[20px] font-black text-white uppercase tracking-[-0.35px]">
            New Search
          </span>
        </Link>
      </header>

      {/* Arrival cards */}
      <main className="flex-1">
        {loading && (
          <div className="px-6 pt-10">
            <p className="text-[16px] font-black uppercase tracking-[2.4px] text-muted">
              Loading...
            </p>
          </div>
        )}

        {error && (
          <div className="px-6 pt-10">
            <p className="text-[20px] font-black uppercase tracking-[-0.35px] text-red">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="px-6 pt-10">
            <p className="text-[20px] font-black uppercase tracking-[-0.35px] text-muted">
              No predictions found
            </p>
          </div>
        )}

        {results.map((result, i) => (
          <ArrivalCard key={i} {...result} />
        ))}
      </main>

      <Footer />
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
