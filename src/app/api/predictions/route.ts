import { NextRequest, NextResponse } from "next/server";

const BASE = "https://retro.umoiq.com/service/publicJSONFeed";

interface UmoiqPrediction {
  minutes: string;
  isDeparture: string;
  affectedByLayover: string;
  dirTag: string;
  vehicle: string;
  block: string;
  tripTag: string;
  epochTime: string;
}

interface UmoiqDirection {
  title: string;
  prediction: UmoiqPrediction | UmoiqPrediction[];
}

interface UmoiqPredictions {
  agencyTitle: string;
  routeTitle: string;
  routeTag: string;
  stopTitle: string;
  stopTag: string;
  dirTitleBecauseNoPredictions?: string;
  direction?: UmoiqDirection | UmoiqDirection[];
}

interface UmoiqStop {
  tag: string;
  title: string;
  lat: string;
  lon: string;
  stopId: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const route = searchParams.get("route");
  const stop = searchParams.get("stop");
  const location = searchParams.get("location")?.toLowerCase();

  if (!route) {
    return NextResponse.json({ error: "route parameter required" }, { status: 400 });
  }

  try {
    // Direct stop lookup — skip routeConfig entirely
    if (stop) {
      const predRes = await fetch(`${BASE}?command=predictions&a=ttc&r=${encodeURIComponent(route)}&s=${encodeURIComponent(stop)}`);
      const predData = await predRes.json();
      const preds: UmoiqPredictions = predData.predictions;
      if (!preds || !preds.direction) {
        return NextResponse.json({ results: [] });
      }
      const directions = Array.isArray(preds.direction) ? preds.direction : [preds.direction];
      const results = directions.map((dir) => {
        const predictions = Array.isArray(dir.prediction) ? dir.prediction : [dir.prediction];
        const departures = predictions.map((p) => ({
          minutes: parseInt(p.minutes, 10),
          type: p.vehicle ? ("live" as const) : ("estimate" as const),
        }));
        const soonCome = departures.length > 0 && departures[0].minutes < 10;
        return {
          stopName: preds.stopTitle,
          direction: dir.title,
          soonCome,
          departures: departures.slice(0, 3),
        };
      });
      return NextResponse.json({ results });
    }

    // Fallback: location-based lookup
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

    let matchedStops = allStops;
    if (location) {
      matchedStops = allStops.filter((s: UmoiqStop) =>
        s.title.toLowerCase().includes(location)
      );
    }

    const stopsToQuery = matchedStops.slice(0, 10);

    if (stopsToQuery.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Fetch predictions for matched stops in parallel
    const predictionPromises = stopsToQuery.map((stop: UmoiqStop) =>
      fetch(`${BASE}?command=predictions&a=ttc&r=${encodeURIComponent(route)}&s=${stop.tag}`)
        .then((r) => r.json())
        .catch(() => null)
    );

    const predictionResults = await Promise.all(predictionPromises);

    const results = predictionResults
      .filter(Boolean)
      .flatMap((data) => {
        const preds: UmoiqPredictions = data.predictions;
        if (!preds || !preds.direction) return [];

        const directions = Array.isArray(preds.direction) ? preds.direction : [preds.direction];

        return directions.map((dir) => {
          const predictions = Array.isArray(dir.prediction) ? dir.prediction : [dir.prediction];
          const departures = predictions.map((p) => ({
            minutes: parseInt(p.minutes, 10),
            type: p.vehicle ? ("live" as const) : ("estimate" as const),
          }));
          const soonCome = departures.length > 0 && departures[0].minutes < 10;

          return {
            stopName: preds.stopTitle,
            direction: dir.title,
            soonCome,
            departures: departures.slice(0, 3),
          };
        });
      });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}
