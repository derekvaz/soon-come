import { NextResponse } from "next/server";

const BASE = "https://retro.umoiq.com/service/publicJSONFeed";

interface UmoiqRoute {
  tag: string;
  title: string;
}

let cachedRoutes: { tag: string; title: string }[] | null = null;

export async function GET() {
  if (cachedRoutes) {
    return NextResponse.json(cachedRoutes);
  }

  try {
    const res = await fetch(`${BASE}?command=routeList&a=ttc`);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch routes" }, { status: 502 });
    }

    const data = await res.json();
    const rawRoutes: UmoiqRoute[] = Array.isArray(data.route) ? data.route : [data.route];

    cachedRoutes = rawRoutes.map((r) => ({
      tag: r.tag,
      title: `${r.tag} - ${r.title}`,
    }));

    return NextResponse.json(cachedRoutes);
  } catch {
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}
