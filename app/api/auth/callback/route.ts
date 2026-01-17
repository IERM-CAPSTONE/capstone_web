import { NextRequest, NextResponse } from "next/server";

/**
 * API route to handle OAuth callback from backend
 * Backend can POST JSON here, and we'll redirect to callback page with user data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract user data from backend response
    const userData = body.user || body;
    
    if (!userData || !userData.email) {
      return NextResponse.json(
        { error: "Missing user data" },
        { status: 400 }
      );
    }

    // Redirect to callback page with user data in query params
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set(
      "user",
      encodeURIComponent(JSON.stringify(userData))
    );

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    console.error("Auth callback API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Also handle GET requests (in case backend redirects with query params)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userDataParam = searchParams.get("user");

  if (userDataParam) {
    // User data already in params, redirect to callback page
    return NextResponse.redirect(new URL("/auth/callback", request.url));
  }

  // No user data, redirect to login
  return NextResponse.redirect(new URL("/auth/login", request.url));
}
