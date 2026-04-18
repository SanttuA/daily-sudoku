(function () {
  var mediaQuery = '(prefers-color-scheme: dark)';
  var storageKey = 'daily-sudoku/theme';
  var fallbackTheme = 'light';

  try {
    fallbackTheme = window.matchMedia(mediaQuery).matches ? 'dark' : 'light';
  } catch {
    fallbackTheme = 'light';
  }

  try {
    var storedTheme = window.localStorage.getItem(storageKey);
    var theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : fallbackTheme;

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = fallbackTheme;
    document.documentElement.style.colorScheme = fallbackTheme;
  }
})();
