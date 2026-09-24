import { NextResponse } from "next/server";

/** JSON response that browsers / Next never cache. */
export function jsonNoStore(
  data: unknown,
  init?: { status?: number; headers?: HeadersInit }
) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      Pragma: "no-cache",
      ...(init?.headers ?? {}),
    },
  });
}
