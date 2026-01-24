/**
 * Proxy route for terminal API calls
 * Forwards requests to the VM workspace service
 */

import { NextRequest, NextResponse } from "next/server";

const VM_BASE_URL =
  process.env.WORKSPACE_API_BASE_URL || "http://localhost:8002";

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
    const path = pathSegments.join("/");
    const url = `${VM_BASE_URL}/api/terminal/${path}`;

    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    let body: string | undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    const headers: HeadersInit = {};
    request.headers.forEach((value, key) => {
      if (
        key.toLowerCase() === "authorization" ||
        key.toLowerCase() === "content-type"
      ) {
        headers[key] = value;
      }
    });

    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
    });

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

    return NextResponse.json(jsonData, {
      status: response.status,
      statusText: response.statusText,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Terminal proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to terminal service" },
      { status: 500 }
    );
  }
}
