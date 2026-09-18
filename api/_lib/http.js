const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

export function methodNotAllowed(allowed = ['POST']) {
  return json(
    { ok: false, error: 'Method not allowed.' },
    405,
    { allow: allowed.join(', ') },
  );
}

export async function readJson(request, maxBytes = 8_192) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Expected application/json.');
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError(413, 'Request body is too large.');
  }

  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new HttpError(413, 'Request body is too large.');
  }

  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 128);
  return (request.headers.get('x-real-ip') || 'unknown').slice(0, 128);
}

export function isAllowedBrowserOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const allowed = new Set();

  // Same-origin: whatever host served this request (custom domain or *.vercel.app).
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // ignore invalid request URLs
  }

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
    try {
      allowed.add(new URL(`${proto}://${host}`).origin);
    } catch {
      // ignore malformed host headers
    }
  }

  for (const raw of [
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '',
  ]) {
    if (!raw) continue;
    try {
      allowed.add(new URL(raw).origin);
    } catch {
      // skip invalid env values; do not reject the whole request
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }

  return allowed.has(origin);
}

export class HttpError extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(error) {
  if (error instanceof HttpError) {
    return json(
      { ok: false, error: error.message, ...(error.code ? { code: error.code } : {}) },
      error.status,
    );
  }

  console.error('ExhibitKIT API request failed', error);
  return json({ ok: false, error: 'The service is temporarily unavailable.' }, 500);
}
