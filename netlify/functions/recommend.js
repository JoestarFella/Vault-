// Gera recomendações de apps usando a API da Anthropic (Claude), com base
// no histórico de downloads do usuário logado.
import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Não autenticado.' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Sessão inválida.' }) };
  }

  const { data: downloads } = await supabase
    .from('downloads')
    .select('app_id, apps(name, genres, description)')
    .eq('user_id', user.id);

  if (!downloads || downloads.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ recommendations: [] }) };
  }

  const downloadedIds = downloads.map(d => d.app_id);

  const { data: candidates } = await supabase
    .from('apps')
    .select('id, name, genres, description')
    .not('id', 'in', `(${downloadedIds.join(',')})`);

  if (!candidates || candidates.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ recommendations: [] }) };
  }

  const historyList = downloads.map(d => `- ${d.apps.name} (${(d.apps.genres || []).join(', ')}): ${d.apps.description?.slice(0, 100) || ''}`).join('\n');
  const candidateList = candidates.map(c => `- id: ${c.id} | ${c.name} (${(c.genres || []).join(', ')}): ${c.description?.slice(0, 100) || ''}`).join('\n');

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Um usuário baixou estes apps:\n${historyList}\n\nApps disponíveis para recomendar:\n${candidateList}\n\nEscolha até 4 apps da lista de disponíveis que combinam com o estilo/gênero dos apps já baixados. Responda APENAS um JSON válido, sem markdown, no formato:\n{"picks":[{"id":"uuid-do-app","reason":"motivo curto de 6-10 palavras em português"}]}`,
        }],
      }),
    });

    const json = await anthropicRes.json();
    const text = json.content?.[0]?.text || '{"picks":[]}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const recommendations = parsed.picks
      .map(pick => {
        const app = candidates.find(c => c.id === pick.id);
        return app ? { ...app, reason: pick.reason } : null;
      })
      .filter(Boolean);

    return { statusCode: 200, body: JSON.stringify({ recommendations }) };
  } catch (err) {
    console.error('Erro na recomendação:', err);
    const downloadedGenres = new Set(downloads.flatMap(d => d.apps.genres || []));
    const fallback = candidates
      .filter(c => c.genres?.some(g => downloadedGenres.has(g)))
      .slice(0, 4)
      .map(c => ({ ...c, reason: 'Mesmo gênero de apps que você baixou' }));
    return { statusCode: 200, body: JSON.stringify({ recommendations: fallback }) };
  }
}