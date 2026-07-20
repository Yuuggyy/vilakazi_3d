import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const FALLBACK_TITLE = 'Menu Digital';
const FALLBACK_DESC = 'Découvrez notre menu et commandez directement en ligne.';
const FALLBACK_FAVICON = '/favicon.svg';

// Injecte le logo, le nom du restaurant et les métadonnées Open Graph
// directement dans index.html à chaque build/dev, en lisant la table
// `parametres` de Supabase. Le favicon (onglet navigateur) et l'aperçu
// de lien (WhatsApp, Facebook...) restent toujours à jour avec ce qui
// est configuré dans l'admin — sans jamais toucher le code à la main.
function metaInjectionPlugin() {
  return {
    name: 'inject-restaurant-meta',
    async transformIndexHtml(html) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

      let nom = FALLBACK_TITLE;
      let logo = FALLBACK_FAVICON;

      if (supabaseUrl && supabaseKey) {
        try {
          const res = await fetch(`${supabaseUrl}/rest/v1/parametres?id=eq.1&select=nom_restaurant,logo_url`, {
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          });
          if (res.ok) {
            const data = await res.json();
            const row = data?.[0];
            if (row?.nom_restaurant) nom = row.nom_restaurant;
            if (row?.logo_url) logo = row.logo_url;
          }
        } catch (err) {
          console.warn('[inject-restaurant-meta] Impossible de récupérer les paramètres:', err.message);
        }
      }

      const title = `${nom} - Menu`;

      return html
        .replaceAll('__TITLE__', title)
        .replaceAll('__OG_TITLE__', title)
        .replaceAll('__OG_DESC__', FALLBACK_DESC)
        .replaceAll('__OG_IMAGE__', logo)
        .replaceAll('__FAVICON_URL__', logo);
    },
  };
}

export default defineConfig({
  plugins: [react(), metaInjectionPlugin()],
  server: { port: 3001 },
});
