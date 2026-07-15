import { getTheme, saveTheme } from './storage.js';

const THEMES = { LIGHT: 'light', DARK: 'dark' };

function prefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === THEMES.DARK ? '#1A1D17' : '#F6F7F1');
}

export function initTheme() {
  const saved = getTheme();
  const theme = saved === THEMES.LIGHT || saved === THEMES.DARK ? saved : prefersDark() ? THEMES.DARK : THEMES.LIGHT;
  applyTheme(theme);
  return theme;
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
}

export function toggleTheme() {
  const next = getCurrentTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  applyTheme(next);
  saveTheme(next);
  return next;
}
