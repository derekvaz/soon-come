"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

interface Route {
  tag: string;
  title: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [route, setRoute] = useState("");
  const [location, setLocation] = useState("");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [open, setOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

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
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = routes.filter(
    (r) =>
      r.tag.toLowerCase().includes(route.toLowerCase()) ||
      r.title.toLowerCase().includes(route.toLowerCase())
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!route.trim()) return;
    const params = new URLSearchParams({ route: route.trim() });
    if (location.trim()) params.set("location", location.trim());
    router.push(`/results?${params.toString()}`);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white px-6 pt-16 pb-2 border-b-[8px] border-black">
        <div className="flex flex-col gap-6">
          <h1 className="text-[96px] font-black leading-[72px] tracking-[-4.76px]">
            Soon
            <br />
            come?
          </h1>
          <p className="text-[16px] font-bold uppercase tracking-[2.89px] opacity-60">
            Toronto Real-Time Transit
          </p>
        </div>
      </header>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="bg-white px-6 pt-6 pb-2 shadow-[0px_8px_0px_0px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-7">
            {/* Route Input */}
            <div>
              <label className="flex items-center gap-[6px] mb-2 pl-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="text-[12px] font-black uppercase tracking-[2.4px]">
                  Route / Line
                </span>
              </label>
              <div className="relative" ref={comboRef}>
                <input
                  type="text"
                  value={route}
                  onChange={(e) => {
                    setRoute(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  placeholder="504"
                  className="w-full h-[79px] border-[3.7px] border-black px-5 text-[16px] font-black uppercase tracking-[0.07px] placeholder:text-muted focus:outline-none"
                />
                {route && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoute("");
                      setOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                    aria-label="Clear route"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {open && filtered.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 max-h-[240px] overflow-y-auto bg-white border-[3.7px] border-t-0 border-black">
                    {filtered.map((r) => (
                      <li key={r.tag}>
                        <button
                          type="button"
                          className="w-full text-left px-5 py-3 text-[14px] font-bold uppercase tracking-[0.07px] hover:bg-black hover:text-white"
                          onClick={() => {
                            setRoute(r.tag);
                            setOpen(false);
                          }}
                        >
                          {r.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Location Input */}
            <div>
              <label className="flex items-center gap-[6px] mb-2 pl-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-[12px] font-black uppercase tracking-[2.4px]">
                  My Location
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="GRENADIER"
                  className="w-full h-[79px] border-[3.7px] border-black px-5 text-[16px] font-black uppercase tracking-[0.07px] placeholder:text-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if ("geolocation" in navigator) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                      });
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                  aria-label="Use my location"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 11l19-9-9 19-2-8-8-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-[79px] bg-black border-[3.7px] border-black text-white text-[24px] font-black uppercase tracking-[-0.41px] mb-2"
          >
            Soon come?
          </button>
        </div>
      </form>

      <Footer />
    </div>
  );
}
