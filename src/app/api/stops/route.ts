import { NextRequest, NextResponse } from "next/server";

const BASE = "https://retro.umoiq.com/service/publicJSONFeed";

interface UmoiqStop {
  tag: string;
  title: string;
  lat: string;
  lon: string;
  stopId: string;
}

interface UmoiqDirectionRef {
  tag: string;
  title: string;
  name: string;
  useForUI: string;
  stop: { tag: string }[] | { tag: string };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const route = searchParams.get("route");
  const direction = searchParams.get("direction");

  if (!route) {
    return NextResponse.json({ error: "route parameter required" }, { status: 400 });
  }

  try {
    const configRes = await fetch(`${BASE}?command=routeConfig&a=ttc&r=${encodeURIComponent(route)}`);
    if (!configRes.ok) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }
    const config = await configRes.json();

    if (config.Error) {
      return NextResponse.json({ error: config.Error.content || "Route not found" }, { status: 404 });
    }

    const routeData = config.route;
    const allStops: UmoiqStop[] = Array.isArray(routeData.stop) ? routeData.stop : [routeData.stop];
    const rawDirections: UmoiqDirectionRef[] = Array.isArray(routeData.direction) ? routeData.direction : [routeData.direction];

    const directions = rawDirections.map((d) => ({ tag: d.tag, title: d.title }));

    let stops: { tag: string; title: string }[] = [];

    if (direction) {
      const dir = rawDirections.find((d) => d.tag === direction);
      if (dir) {
        const dirStopRefs = Array.isArray(dir.stop) ? dir.stop : [dir.stop];
        const dirStopTags = new Set(dirStopRefs.map((s) => s.tag));
        const stopMap = new Map(allStops.map((s) => [s.tag, s]));
        stops = dirStopRefs
          .filter((ref) => dirStopTags.has(ref.tag) && stopMap.has(ref.tag))
          .map((ref) => {
            const full = stopMap.get(ref.tag)!;
            return { tag: full.tag, title: full.title };
          });
      }
    }

    return NextResponse.json({ directions, stops });
  } catch {
    return NextResponse.json({ error: "Failed to fetch route config" }, { status: 500 });
  }
}
