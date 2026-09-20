import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// O modo do navegador é decidido na carga do módulo, então recarregamos
// o módulo depois de mexer nas variáveis de ambiente.
function loadFetcher() {
  delete require.cache[require.resolve('./plateFetcher.js')];
  return require('./plateFetcher.js');
}

describe('plateFetcher', () => {
  const originalEndpoint = process.env.PLATE_BROWSER_WS_ENDPOINT;

  afterEach(() => {
    if (originalEndpoint === undefined) {
      delete process.env.PLATE_BROWSER_WS_ENDPOINT;
    } else {
      process.env.PLATE_BROWSER_WS_ENDPOINT = originalEndpoint;
    }
  });

  it('usa o Chromium local quando não há endpoint CDP', () => {
    delete process.env.PLATE_BROWSER_WS_ENDPOINT;
    expect(loadFetcher().browserMode()).toBe('local');
  });

  it('usa navegador remoto quando PLATE_BROWSER_WS_ENDPOINT está definido', () => {
    process.env.PLATE_BROWSER_WS_ENDPOINT = 'wss://exemplo.test?token=abc';
    const fetcher = loadFetcher();

    expect(fetcher.browserMode()).toBe('remote');
    expect(fetcher.config.wsEndpoint).toBe('wss://exemplo.test?token=abc');
  });

  it('descarta HTML de desafio e aceita HTML com dados da FIPE', () => {
    const { isReusablePlateHtml } = loadFetcher();

    expect(isReusablePlateHtml('<html><title>Just a moment...</title></html>')).toBe(false);
    expect(
      isReusablePlateHtml('<table class="fipeTablePriceDetail"><tr><td>Marca:</td></tr></table>')
    ).toBe(true);
  });
});
