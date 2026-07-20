-- Seed initial (placeholder) — à modifier librement depuis /admin

INSERT INTO public.categories (nom, emoji, ordre) VALUES ('Entrées', '🥗', 0) RETURNING id;
INSERT INTO public.categories (nom, emoji, ordre) VALUES ('Plats Signature', '🍛', 1) RETURNING id;
INSERT INTO public.categories (nom, emoji, ordre) VALUES ('Boissons', '🥤', 2) RETURNING id;

-- Puis récupère les id générés ci-dessus et lance les inserts produits correspondants,
-- ou plus simple : ajoute directement les plats depuis l'admin (/admin) une fois connecté.