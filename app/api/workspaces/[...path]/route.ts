/**
 * Proxy route for workspace API calls
 * Forwards requests to the VM workspace service to avoid mixed content issues
 * (HTTPS frontend -> HTTP VM)
 */

import { NextRequest, NextResponse } from "next/server";

// Use HTTPS domain in production, fallback to local Docker Compose for development
const VM_BASE_URL =
  process.env.WORKSPACE_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://workspaces.gitguide.dev"
    : "http://localhost:8002");

export async function OPTIONS() {
  // Handle CORS preflight
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "DELETE");
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Reconstruct the path
    const path = pathSegments.join("/");
    const url = `${VM_BASE_URL}/api/workspaces/${path}`;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    // Get request body if present
    let body: string | undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    // Forward headers (especially Authorization)
    const headers: HeadersInit = {};
    request.headers.forEach((value, key) => {
      // Forward important headers
      if (
        key.toLowerCase() === "authorization" ||
        key.toLowerCase() === "content-type"
      ) {
        headers[key] = value;
      }
    });

    // Make request to VM
    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
    });

    // Get response data
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    // Forward CORS headers from backend
    const corsHeaders: HeadersInit = {};
    const corsHeaderNames = [
      "access-control-allow-origin",
      "access-control-allow-credentials",
      "access-control-allow-methods",
      "access-control-allow-headers",
      "access-control-expose-headers",
    ];

    response.headers.forEach((value, key) => {
      if (corsHeaderNames.includes(key.toLowerCase())) {
        corsHeaders[key] = value;
      }
    });

    // Return response with same status and CORS headers
    return NextResponse.json(jsonData, {
      status: response.status,
      statusText: response.statusText,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Workspace proxy error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to proxy request to workspace service",
        detail: errorMessage,
        url: `${VM_BASE_URL}/api/workspaces/${pathSegments.join("/")}`,
      },
      { status: 500 }
    );
  }
}
