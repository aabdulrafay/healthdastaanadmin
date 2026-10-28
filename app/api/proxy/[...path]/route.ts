import { NextRequest, NextResponse } from 'next/server';

function getTargetUrl(subPath: string, search: string): string {
  const internal = process.env.INTERNAL_API_BASE_URL;
  const baseUrl =
    internal && !internal.includes('backend:3000') && !internal.includes('localhost:3000')
      ? internal
      : process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        'https://api.healthdastaan.com/v1';

  return `${baseUrl.replace(/\/$/, '')}/${subPath}${search}`;
}

async function handleProxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const subPath = Array.isArray(path) ? path.join('/') : path;
  const search = req.nextUrl.search;
  const targetUrl = getTargetUrl(subPath, search);

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== 'host' &&
      lower !== 'connection' &&
      lower !== 'origin' &&
      lower !== 'referer' &&
      lower !== 'content-length'
    ) {
      forwardHeaders.set(key, value);
    }
  });

  let body: string | undefined = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.text();
    } catch {
      // Empty body
    }
  }

  try {
    let backendRes: Response;
    try {
      backendRes = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body,
      });
    } catch (networkError) {
      if (!targetUrl.startsWith('https://api.healthdastaan.com/v1')) {
        const fallbackUrl = `https://api.healthdastaan.com/v1/${subPath}${search}`;
        backendRes = await fetch(fallbackUrl, {
          method: req.method,
          headers: forwardHeaders,
          body,
        });
      } else {
        throw networkError;
      }
    }

    const responseText = await backendRes.text();
    const responseHeaders = new Headers();

    backendRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower !== 'content-encoding' &&
        lower !== 'cross-origin-resource-policy' &&
        lower !== 'content-security-policy'
      ) {
        responseHeaders.set(key, value);
      }
    });

    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

    return new NextResponse(responseText, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend connection error';
    return NextResponse.json(
      {
        statusCode: 502,
        message: `Failed to connect to backend service at ${targetUrl}: ${message}`,
        error: 'Bad Gateway',
      },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
