// eslint-disable-next-line @typescript-eslint/no-require-imports
const UAParser = require('ua-parser-js');

export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
}

export function parseUserAgent(uaString: string | null): ParsedUserAgent {
  if (!uaString) {
    return { browser: 'Unknown', os: 'Unknown', device: 'desktop' };
  }

  const parser = new UAParser(uaString);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  return {
    browser: browser.name || 'Unknown',
    os: os.name || 'Unknown',
    device: device.type || 'desktop',
  };
}
