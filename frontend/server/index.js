const express = require('express');
const cors = require('cors');

const {
  SOURCE_URL,
  normalizePlateInput,
  isValidPlate,
  parsePlateHtml,
} = require('./plateScraper.js');

const app = express();

app.use(cors({
  origin: 'https://mariobignami.github.io',
}));

app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fipefacil-api',
    diagnostic: true,
  });
});

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

  const targetUrl =
    `${SOURCE_URL}?placa=${encodeURIComponent(normalizedPlate)}`;

  console.log('========================================');
  console.log('[plate-proxy] Nova consulta');
  console.log('[plate-proxy] Placa:', normalizedPlate);
  console.log('[plate-proxy] URL:', targetUrl);
  console.log('[plate-proxy] Fonte:', SOURCE_URL);
  console.log('========================================');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',

      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',

        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',

        'Accept-Language':
          'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',

        'Referer': SOURCE_URL,

        'Cache-Control': 'no-cache',

        'Pragma': 'no-cache',
      },

      signal: controller.signal,
      redirect: 'follow',
    });

    console.log('[plate-proxy] HTTP status:', response.status);
    console.log('[plate-proxy] Status:', response.statusText);
    console.log(
      '[plate-proxy] URL final:',
      response.url
    );

    // Mostra apenas headers úteis para diagnóstico.
    console.log('[plate-proxy] Headers relevantes:', {
      server: response.headers.get('server'),
      location: response.headers.get('location'),
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
      'cache-control': response.headers.get('cache-control'),
      'x-powered-by': response.headers.get('x-powered-by'),
      'cf-ray': response.headers.get('cf-ray'),
      'cf-cache-status': response.headers.get('cf-cache-status'),
      'retry-after': response.headers.get('retry-after'),
    });

    const html = await response.text();

    console.log(
      '[plate-proxy] Tamanho da resposta:',
      html.length
    );

    // Não colocamos a resposta inteira no log.
    // Apenas os primeiros 1000 caracteres para identificar
    // se é uma página de bloqueio, erro, Cloudflare etc.
    if (!response.ok) {
      console.log(
        '[plate-proxy] Corpo inicial da resposta:'
      );

      console.log(
        html.substring(0, 1000)
      );

      console.log('========================================');
      console.log(
        '[plate-proxy] FONTE RECUSOU A REQUISIÇÃO'
      );
      console.log('========================================');

      return res.status(503).json({
        error: {
          code: 'SOURCE_UNAVAILABLE',
          message:
            'A fonte de dados está indisponível no momento. Tente novamente em instantes.',
        },

        diagnostic: {
          sourceStatus: response.status,
          sourceStatusText: response.statusText,
          finalUrl: response.url,
        },
      });
    }

    const parsed = parsePlateHtml(
      html,
      normalizedPlate
    );

    console.log(
      '[plate-proxy] Parser result:',
      parsed.type
    );

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

    console.log(
      '[plate-proxy] Consulta concluída com sucesso.'
    );

    return res.json(parsed.data);

  } catch (error) {
    console.error(
      '[plate-proxy] ERRO NA REQUISIÇÃO:'
    );

    console.error({
      name: error?.name,
      message: error?.message,
      cause: error?.cause,
      code: error?.code,
    });

    const isAbortError =
      error?.name === 'AbortError';

    return res.status(503).json({
      error: {
        code: isAbortError
          ? 'SOURCE_TIMEOUT'
          : 'SOURCE_UNAVAILABLE',

        message: isAbortError
          ? 'A consulta demorou mais do que o esperado. Tente novamente.'
          : 'Falha ao consultar a fonte de dados. Verifique a conexão e tente novamente.',
      },
    });

  } finally {
    clearTimeout(timeout);
  }
});

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `[plate-proxy] Running on port ${PORT}`
    );
  }
);
