// Path of an installed Edge or Chrome, for the scripts that drive a headless browser.
// Set BROWSER to its path if it is not found.
import { existsSync } from 'node:fs';

export const browserPath = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
