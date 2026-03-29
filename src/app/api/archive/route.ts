import { NextResponse } from 'next/server';
import { getDailyAnswersWithGameApi, getGameApiStatus } from '@/lib/game-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json(
      { success: false, error: 'Date parameter is required (format: YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json(
      { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  const result = await getDailyAnswersWithGameApi(date);

  if (!result.success || !result.data) {
    return NextResponse.json(
      { success: false, error: result.error || 'Failed to fetch archive data' },
      { status: 503 }
    );
  }

  const gameApiStatus = getGameApiStatus();

  return NextResponse.json({
    success: true,
    source: result.source,
    dataSource: result.dataSource,
    data: result.data,
    meta: {
      gameApi: {
        hasAuth: gameApiStatus.hasAuth,
        deviceId: gameApiStatus.deviceId ? gameApiStatus.deviceId.substring(0, 8) + '...' : null,
        playerId: gameApiStatus.playerId,
      },
    },
  });
}
