import { NextRequest, NextResponse } from "next/server";
import { fetchPuzzleById } from "@/lib/codycross-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing puzzle id parameter.",
      },
      { status: 400 }
    );
  }

  try {
    const data = await fetchPuzzleById(id);

    if (data) {
      return NextResponse.json({
        success: true,
        data,
        source: "live",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Puzzle not found or API unavailable.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error(`[API /puzzle?id=${id}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch puzzle data.",
      },
      { status: 500 }
    );
  }
}
