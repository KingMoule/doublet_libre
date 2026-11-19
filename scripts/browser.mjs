// Path of an installed Edge or Chrome, for the scripts that drive a headless browser.
// Set BROWSER to its path if it is not found.
import { existsSync } from 'node:fs';

export const browserPath = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', // before Chromium: on Ubuntu that one is often a snap, which cannot use /tmp
  '/usr/bin/chromium',
].find((p) => p && existsSync(p));
