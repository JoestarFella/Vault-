// Busca metadados de um app na Google Play Store usando a biblioteca
// gratuita "google-play-scraper" (sem chave de API, sem limite de uso,
// mas pode falhar ocasionalmente se o Google mudar a estrutura da página).
import gplay from 'google-play-scraper';

export async function handler(event) {
  const query = event.queryStringParameters?.q;

  if (!query || !query.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Informe o nome do app para buscar.' }),
    };
  }

  try {
    const results = await gplay.search({
      term: query,
      num: 1,
      country: 'br',
      lang: 'pt',
    });

    if (!results.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Nenhum app encontrado na Play Store para "${query}".` }),
      };
    }

    const app = await gplay.app({ appId: results[0].appId, country: 'br', lang: 'pt' });

    return {
      statusCode: 200,
      body: JSON.stringify({
        name: app.title,
        developer: app.developer,
        description: (app.summary || app.description || '').slice(0, 600),
        genres: [app.genre, ...(app.categories?.map(c => c.name) || [])].filter(Boolean).slice(0, 3),
        icon_url: app.icon,
        screenshots: (app.screenshots || []).slice(0, 6),
        version: app.version || null,
        size_mb: null,
      }),
    };
  } catch (err) {
    console.error('Erro ao buscar na Play Store:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'A busca na Play Store falhou agora. Tente novamente ou preencha manualmente.' }),
    };
  }
}