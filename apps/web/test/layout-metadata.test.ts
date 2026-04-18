import React from 'react';
import { describe, expect, it } from 'vitest';

import RootLayout, { metadata, viewport } from '../app/layout';
import nextConfig from '../next.config';
import { getWebSecurityHeaders, themeInitScriptSrc } from '../lib/security';

describe('layout metadata', () => {
  it('publishes the manifest and theme colors for browser chrome', () => {
    expect(metadata.manifest).toBe('/manifest.webmanifest');
    expect(viewport.themeColor).toEqual([
      { media: '(prefers-color-scheme: light)', color: '#fff8ec' },
      { media: '(prefers-color-scheme: dark)', color: '#18130f' },
    ]);
  });

  it('loads the theme bootstrap from a first-party script tag', () => {
    const tree = RootLayout({ children: React.createElement('div') });
    const rootChildren = React.Children.toArray(tree.props.children);
    const head = rootChildren[0] as React.ReactElement<{ children?: React.ReactNode }>;
    const headChildren = React.Children.toArray(head.props.children);
    const script = headChildren[0] as React.ReactElement<{
      dangerouslySetInnerHTML?: unknown;
      src?: string;
      strategy?: string;
    }>;

    expect(script.props.src).toBe(themeInitScriptSrc);
    expect(script.props.strategy).toBe('beforeInteractive');
    expect(script.props.dangerouslySetInnerHTML).toBeUndefined();
  });

  it('publishes development security headers that stay compatible with next dev', async () => {
    const headersConfig = await nextConfig.headers?.();
    const pageHeaders = headersConfig?.find((entry) => entry.source === '/(.*)')?.headers ?? [];
    const contentSecurityPolicy = pageHeaders.find(
      (entry) => entry.key === 'Content-Security-Policy',
    )?.value;
    const scriptDirective = contentSecurityPolicy
      ?.split('; ')
      .find((directive) => directive.startsWith('script-src'));
    const connectDirective = contentSecurityPolicy
      ?.split('; ')
      .find((directive) => directive.startsWith('connect-src'));

    expect(scriptDirective).toContain("'unsafe-inline'");
    expect(scriptDirective).toContain("'unsafe-eval'");
    expect(connectDirective).toContain('ws:');
    expect(pageHeaders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'Content-Security-Policy' }),
        expect.objectContaining({ key: 'Permissions-Policy' }),
        expect.objectContaining({ key: 'Referrer-Policy' }),
        expect.objectContaining({ key: 'X-Content-Type-Options' }),
      ]),
    );
  });

  it('keeps production csp compatible with next runtime while avoiding eval', () => {
    const productionHeaders = getWebSecurityHeaders(undefined, 'production');
    const contentSecurityPolicy = productionHeaders.find(
      (entry) => entry.key === 'Content-Security-Policy',
    )?.value;
    const scriptDirective = contentSecurityPolicy
      ?.split('; ')
      .find((directive) => directive.startsWith('script-src'));

    expect(scriptDirective).toContain("'self'");
    expect(scriptDirective).toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
  });
});
