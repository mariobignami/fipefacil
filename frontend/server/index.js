const express = require('express');
const cors = require('cors');

const {
  SOURCE_URL,
  normalizePlateInput,
  isValidPlate,
  parsePlateHtml,
} = require('./plateScraper.js');

const app = express();

/*
 * Permite que o frontend hospedado no GitHub Pages
 * faça requisições para esta API.
 */
app.use(cors({
  origin: 'https://mariobignami.github.io',
}));

app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/api/placa', async (req, res) => {
  const normalizedPlate = normalizePlateInput(req.query?.placa);

  if (!isValidPlate(normalizedPlate)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_PLATE',
        message:
          'Placa inválida. Use um formato válido, como ABC1234 ou ABC1D23.',
      },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(
      `${SOURCE_URL}?placa=${encodeURIComponent(normalizedPlate)}`,
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',

          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',

          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',

          Referer: SOURCE_URL,

          'Cache-Control': 'no-cache',

          Pragma: 'no-cache',
        },

        signal: controller.signal,
      }
    );

    if (!response.ok) {
      console.error(
        `[plate-proxy] Fonte retornou HTTP ${response.status}`
      );

      return res.status(503).json({
        error: {
          code: 'SOURCE_UNAVAILABLE',
          message:
            'A fonte de dados está indisponível no momento. Tente novamente em instantes.',
        },
      });
    }

    const html = await response.text();

    const parsed = parsePlateHtml(html, normalizedPlate);

    if (parsed.type === 'not_found') {
      return res.status(404).json({
        error: {
          code: 'PLATE_NOT_FOUND',
          message: parsed.message,
        },
      });
    }

    if (parsed.type === 'selector_changed') {
      return res.status(502).json({
        error: {
          code: 'SCRAPING_PARSER_ERROR',
          message:
            'Não conseguimos interpretar os dados da fonte agora. Tente novamente mais tarde.',
        },

        meta: {
          source: SOURCE_URL,
          queriedAt: new Date().toISOString(),
          warnings: parsed.warnings || [],
        },
      });
    }

    return res.json(parsed.data);
  } catch (error) {
    console.error('[plate-proxy] Erro na consulta:', error);

    const isAbortError = error?.name === 'AbortError';

    return res.status(503).json({
      error: {
        code: isAbortError ? 'SOURCE_TIMEOUT' : 'SOURCE_UNAVAILABLE',

        message: isAbortError
          ? 'A consulta demorou mais do que o esperado. Tente novamente.'
          : 'Falha ao consultar a fonte de dados. Verifique a conexão e tente novamente.',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fipefacil-api',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[plate-proxy] Running on port ${PORT}`);
});
