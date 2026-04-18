export const themeInitScriptSrc = '/theme-init.js';

const defaultApiOrigins = ['http://127.0.0.1:4000', 'http://localhost:4000'];

function tryParseOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getWebContentSecurityPolicy(
  configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
  nodeEnv = process.env.NODE_ENV,
): string {
  const connectSources = new Set<string>(["'self'", ...defaultApiOrigins]);
  const scriptSources = new Set<string>(["'self'"]);
  const configuredApiOrigin = tryParseOrigin(configuredApiBaseUrl);

  if (configuredApiOrigin) {
    connectSources.add(configuredApiOrigin);
  }

  if (nodeEnv !== 'production') {
    connectSources.add('ws:');
    connectSources.add('wss:');
    scriptSources.add("'unsafe-eval'");
    scriptSources.add("'unsafe-inline'");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${[...connectSources].join(' ')}`,
    "font-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    `script-src ${[...scriptSources].join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
  ].join('; ');
}

export function getWebSecurityHeaders(
  configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
  nodeEnv = process.env.NODE_ENV,
): Array<{ key: string; value: string }> {
  const headers = [
    {
      key: 'Content-Security-Policy',
      value: getWebContentSecurityPolicy(configuredApiBaseUrl, nodeEnv),
    },
    {
      key: 'Permissions-Policy',
      value:
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
  ];

  if (nodeEnv === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
}
