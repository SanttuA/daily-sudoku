export const defaultPlaywrightBrowser = 'chromium';
export const supportedPlaywrightBrowsers = ['chromium', 'firefox', 'all', 'auto'] as const;

export type PlaywrightBrowserSelection = (typeof supportedPlaywrightBrowsers)[number];

type BrowserArgsResult = {
  browserSelection: PlaywrightBrowserSelection;
  passthroughArgs: string[];
};

export function resolvePlaywrightBrowserSelection(
  value: string | undefined,
): PlaywrightBrowserSelection {
  if (!value) {
    return defaultPlaywrightBrowser;
  }

  const normalized = value.trim().toLowerCase();

  if (isPlaywrightBrowserSelection(normalized)) {
    return normalized;
  }

  throw new Error(
    `Invalid Playwright browser "${value}". Expected one of: ${supportedPlaywrightBrowsers.join(', ')}.`,
  );
}

export function parsePlaywrightBrowserArgs(args: string[]): BrowserArgsResult {
  const passthroughArgs: string[] = [];
  let browserSelection = resolvePlaywrightBrowserSelection(process.env.PLAYWRIGHT_BROWSER);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) {
      continue;
    }

    if (arg.startsWith('--browser=')) {
      browserSelection = resolvePlaywrightBrowserSelection(arg.slice('--browser='.length));
      continue;
    }

    if (arg === '--browser') {
      const value = args[index + 1];

      if (!value) {
        throw new Error('Expected a value after --browser.');
      }

      browserSelection = resolvePlaywrightBrowserSelection(value);
      index += 1;
      continue;
    }

    passthroughArgs.push(arg);
  }

  return {
    browserSelection,
    passthroughArgs,
  };
}

function isPlaywrightBrowserSelection(value: string): value is PlaywrightBrowserSelection {
  return supportedPlaywrightBrowsers.includes(value as PlaywrightBrowserSelection);
}
