import { NextResponse } from 'next/server';

// Tells the frontend whether Google OAuth is available
export async function GET() {
  return NextResponse.json({
    googleEnabled:
      !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
  });
}
