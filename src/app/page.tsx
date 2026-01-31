"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

interface Option {
  tag: string;
  title: string;
}

function Combobox({
  label,
  icon,
  placeholder,
  value,
  options,
  onSelect,
  onClear,
}: {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  options: Option[];
  onSelect: (tag: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedTitle = options.find((o) => o.tag === value)?.title ?? "";
  const display = value ? selectedTitle : query;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(
    (o) =>
      o.tag.toLowerCase().includes((value ? "" : query).toLowerCase()) ||
      o.title.toLowerCase().includes((value ? "" : query).toLowerCase())
  );

  return (
    <div>
      <label className="flex items-center gap-[6px] mb-2 pl-1">
        {icon}
        <span className="text-[12px] font-black uppercase tracking-[2.4px]">
          {label}
        </span>
      </label>
      <div className="relative" ref={ref}>
        <input
          type="text"
          value={display}
          onChange={(e) => {
            if (value) {
              onClear();
            }
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          readOnly={!!value}
          className="w-full h-[79px] border-[3.7px] border-black px-5 text-[16px] font-black uppercase tracking-[0.07px] placeholder:text-muted focus:outline-none"
        />
        {(value || query) && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
            aria-label={`Clear ${label}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {open && !value && filtered.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 max-h-[240px] overflow-y-auto bg-white border-[3.7px] border-t-0 border-black">
            {filtered.map((o) => (
              <li key={o.tag}>
                <button
                  type="button"
                  className="w-full text-left px-5 py-3 text-[14px] font-bold uppercase tracking-[0.07px] hover:bg-black hover:text-white"
                  onClick={() => {
                    onSelect(o.tag);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {o.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Option[]>([]);
  const [route, setRoute] = useState("");
  const [directions, setDirections] = useState<Option[]>([]);
  const [direction, setDirection] = useState("");
  const [stops, setStops] = useState<Option[]>([]);
  const [stop, setStop] = useState("");

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRoutes(data);
      })
      .catch(() => {});
  }, []);

  const handleRouteSelect = useCallback((tag: string) => {
    setRoute(tag);
    setDirection("");
    setDirections([]);
    setStop("");
    setStops([]);
    fetch(`/api/stops?route=${encodeURIComponent(tag)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.directions) setDirections(data.directions);
      })
      .catch(() => {});
  }, []);

  const handleDirectionSelect = useCallback(
    (tag: string) => {
      setDirection(tag);
      setStop("");
      setStops([]);
      fetch(`/api/stops?route=${encodeURIComponent(route)}&direction=${encodeURIComponent(tag)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.stops) setStops(data.stops);
        })
        .catch(() => {});
    },
    [route]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!route || !stop) return;
    const params = new URLSearchParams({ route, stop });
    router.push(`/results?${params.toString()}`);
  }

  const routeIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );

  const directionIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );

  const stopIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );

  return (
    <div className="flex flex-col min-h-screen">
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

      <form onSubmit={handleSubmit} className="bg-white px-6 pt-6 pb-2 shadow-[0px_8px_0px_0px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-7">
            <Combobox
              label="Route / Line"
              icon={routeIcon}
              placeholder="504"
              value={route}
              options={routes}
              onSelect={handleRouteSelect}
              onClear={() => {
                setRoute("");
                setDirection("");
                setDirections([]);
                setStop("");
                setStops([]);
              }}
            />

            {route && directions.length > 0 && (
              <Combobox
                label="Direction"
                icon={directionIcon}
                placeholder="Select direction"
                value={direction}
                options={directions}
                onSelect={handleDirectionSelect}
                onClear={() => {
                  setDirection("");
                  setStop("");
                  setStops([]);
                }}
              />
            )}

            {direction && stops.length > 0 && (
              <Combobox
                label="Stop"
                icon={stopIcon}
                placeholder="Select stop"
                value={stop}
                options={stops}
                onSelect={setStop}
                onClear={() => setStop("")}
              />
            )}
          </div>

          {stop && (
            <button
              type="submit"
              className="w-full h-[79px] bg-black border-[3.7px] border-black text-white text-[24px] font-black uppercase tracking-[-0.41px] mb-2"
            >
              Soon come?
            </button>
          )}
        </div>
      </form>

      <Footer />
    </div>
  );
}
