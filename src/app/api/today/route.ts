import { NextResponse } from 'next/server';
import { getTodayAnswers } from '@/lib/codycross-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json(
      { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  const result = await getTodayAnswers(date);

  if (!result.success || !result.data) {
    return NextResponse.json(
      { success: false, error: result.error || 'Failed to fetch puzzle data' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    source: result.source,
    data: result.data,
  });
}
