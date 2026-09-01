-- ============================================
-- BASE PARTAGÉE MULTI-RESTAURANTS
-- Vilakazi / LeLieu / Auspices
-- À exécuter UNE SEULE FOIS dans le SQL Editor
-- du nouveau projet Supabase partagé
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Restaurants (remplace l'ancienne table "parametres", multi-lignes) ──
CREATE TABLE public.restaurants (
  slug           TEXT PRIMARY KEY,
  nom_restaurant TEXT NOT NULL,
  logo_url       TEXT,
  adresse        TEXT,
  telephone      TEXT,
  whatsapp       TEXT,
  horaires       TEXT,
  ouvert         BOOLEAN DEFAULT true,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Catégories ──
CREATE TABLE public.categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_slug TEXT NOT NULL REFERENCES public.restaurants(slug) ON DELETE CASCADE,
  nom             TEXT NOT NULL,
  description     TEXT,
  emoji           TEXT DEFAULT '🍽️',
  ordre           INTEGER DEFAULT 0,
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Produits ──
CREATE TABLE public.produits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_slug TEXT NOT NULL REFERENCES public.restaurants(slug) ON DELETE CASCADE,
  categorie_id    UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  nom             TEXT NOT NULL,
  description     TEXT,
  prix             NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url        TEXT,
  disponible       BOOLEAN DEFAULT true,
  ordre            INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Commandes ──
CREATE TABLE public.commandes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_slug    TEXT NOT NULL REFERENCES public.restaurants(slug) ON DELETE CASCADE,
  numero_table       TEXT NOT NULL,
  statut             TEXT NOT NULL DEFAULT 'recue'
                       CHECK (statut IN ('recue', 'en_cours', 'terminee', 'annulee')),
  demandes_speciales TEXT,
  montant_total      NUMERIC(10,2) DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Lignes de commande ──
CREATE TABLE public.commande_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_slug TEXT NOT NULL REFERENCES public.restaurants(slug) ON DELETE CASCADE,
  commande_id     UUID NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE,
  produit_id      UUID REFERENCES public.produits(id) ON DELETE SET NULL,
  nom_produit     TEXT NOT NULL,
  prix_unit       NUMERIC(10,2) NOT NULL,
  quantite        INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Appels serveur ──
CREATE TABLE public.appels_serveur (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_slug TEXT NOT NULL REFERENCES public.restaurants(slug) ON DELETE CASCADE,
  numero_table    TEXT NOT NULL,
  message         TEXT DEFAULT 'Un client demande le serveur',
  traite          BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Profils admin (un admin = rattaché à UN restaurant via restaurant_slug) ──
CREATE TABLE public.admin_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  nom             TEXT,
  restaurant_slug TEXT REFERENCES public.restaurants(slug) ON DELETE SET NULL,
  role            TEXT DEFAULT 'admin',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Triggers updated_at ──
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_produits_updated_at   BEFORE UPDATE ON public.produits   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_commandes_updated_at  BEFORE UPDATE ON public.commandes  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger : création auto du profil admin à l'inscription ──
-- Le restaurant_slug est lu depuis les métadonnées utilisateur.
-- Quand tu crées le compte dans Supabase > Authentication > Add user,
-- mets dans "User Metadata" (JSON) :  {"restaurant_slug": "vilakazi", "nom": "Admin Vilakazi"}
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_profiles (id, email, nom, restaurant_slug)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', 'Admin'),
    NEW.raw_user_meta_data->>'restaurant_slug'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin();

-- ── RLS ──
ALTER TABLE public.restaurants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commandes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commande_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appels_serveur   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles   ENABLE ROW LEVEL SECURITY;

-- Lecture publique : menu + infos restaurant (nécessaire pour la carte publique)
CREATE POLICY "lecture_publique_restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "lecture_publique_categories"  ON public.categories  FOR SELECT USING (true);
CREATE POLICY "lecture_publique_produits"    ON public.produits    FOR SELECT USING (true);

-- Commandes/items/appels : insertion publique (client anonyme qui commande)
CREATE POLICY "insertion_commandes" ON public.commandes      FOR INSERT WITH CHECK (true);
CREATE POLICY "insertion_items"     ON public.commande_items FOR INSERT WITH CHECK (true);
CREATE POLICY "insertion_appel"     ON public.appels_serveur  FOR INSERT WITH CHECK (true);

-- Écriture réservée à l'admin DU restaurant concerné (ou service_role)
CREATE POLICY "admin_write_restaurants" ON public.restaurants FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = restaurants.slug));

CREATE POLICY "admin_write_categories" ON public.categories FOR ALL
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = categories.restaurant_slug));

CREATE POLICY "admin_write_produits" ON public.produits FOR ALL
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = produits.restaurant_slug));

CREATE POLICY "admin_read_commandes" ON public.commandes FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = commandes.restaurant_slug));
CREATE POLICY "admin_update_commandes" ON public.commandes FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = commandes.restaurant_slug));
CREATE POLICY "admin_delete_commandes" ON public.commandes FOR DELETE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = commandes.restaurant_slug));

CREATE POLICY "admin_read_items" ON public.commande_items FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = commande_items.restaurant_slug));

CREATE POLICY "admin_read_appels" ON public.appels_serveur FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = appels_serveur.restaurant_slug));
CREATE POLICY "admin_update_appels" ON public.appels_serveur FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles WHERE restaurant_slug = appels_serveur.restaurant_slug));

CREATE POLICY "admin_profiles_self" ON public.admin_profiles FOR ALL
  USING (auth.role() = 'service_role' OR auth.uid() = id);

-- ── Storage : bucket images partagé (chemins préfixés par slug côté appli) ──
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "lecture_publique_images" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "upload_admin_images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "update_admin_images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "delete_admin_images" ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND auth.uid() IN (SELECT id FROM public.admin_profiles));

-- ── Seed : les 3 restaurants + un menu de démarrage (à éditer depuis /admin) ──
INSERT INTO public.restaurants (slug, nom_restaurant, adresse, telephone, whatsapp, horaires, ouvert) VALUES
  ('vilakazi', 'Vilakazi Restaurant', '22, Avenue Tombalbaye, Gombe, Kinshasa — Otantika Galeries, 4e Niveau (Réf. Rond Point Kin Mazière)', '+243 812 769 071', '243892079726', 'Tous les jours dès 12h00', true),
  ('lelieu',   'LeLieu — Rumba & Old School Lounge', '2, Avenue Tombalbaye, Gombe, Kinshasa — Immeuble Otantika (Réf. Rond Point Kin Mazière)', '+243 820 290 491', '243820290491', 'Lundi - Dimanche · 12h00 - tard dans la nuit', true),
  ('auspices', 'Auspices Restaurant', '03, Avenue des Ambassadeurs, Gombe, Kinshasa (Réf: Athénée de la Gombe)', '+243 821 568 935', '243970269588', 'Lun-Jeu: 9h-21h · Ven-Sam: 9h-23h', true);

INSERT INTO public.categories (restaurant_slug, nom, emoji, ordre) VALUES
  ('vilakazi', 'Entrées', '🥗', 1), ('vilakazi', 'Plats Signature', '🍛', 2), ('vilakazi', 'Boissons', '🥤', 3),
  ('lelieu',   'Cocktails Signature', '🍸', 1), ('lelieu', 'Boissons', '🍾', 2), ('lelieu', 'Snacks', '🍢', 3),
  ('auspices', 'Plats Congolais', '🍲', 1), ('auspices', 'Accompagnements', '🍚', 2), ('auspices', 'Boissons', '🥤', 3);

INSERT INTO public.produits (restaurant_slug, categorie_id, nom, description, prix, ordre)
SELECT 'vilakazi', c.id, x.nom, x.description, x.prix, x.ordre
FROM public.categories c
JOIN (VALUES
  ('Entrées', 'Ailes de poulet au Makala', 'Ailes de poulet grillées façon braise, épices maison', 15, 1),
  ('Entrées', 'Beignets de crevettes épicés', 'Croustillants, sauce pili-pili', 12, 2),
  ('Plats Signature', 'Poisson braisé entier', 'Poisson frais braisé, bananes plantains, sauce épicée', 22, 1),
  ('Plats Signature', 'Poulet fumé à la congolaise', 'Poulet fumé, riz, légumes sautés', 18, 2),
  ('Plats Signature', 'Bœuf mikate & sauce arachide', 'Bœuf mijoté sauce arachide, fufu ou riz', 20, 3),
  ('Boissons', 'Jus de bissap frais', 'Fait maison, glacé', 6, 1),
  ('Boissons', 'Jus de gingembre', 'Fait maison, épicé et rafraîchissant', 6, 2)
) AS x(cat_nom, nom, description, prix, ordre) ON x.cat_nom = c.nom
WHERE c.restaurant_slug = 'vilakazi';

INSERT INTO public.produits (restaurant_slug, categorie_id, nom, description, prix, ordre)
SELECT 'lelieu', c.id, x.nom, x.description, x.prix, x.ordre
FROM public.categories c
JOIN (VALUES
  ('Cocktails Signature', 'Rumba Sunset', 'Rhum ambré, passion, citron vert', 12, 1),
  ('Cocktails Signature', 'Old School Mule', 'Vodka, gingembre, citron vert', 11, 2),
  ('Boissons', 'Bouteille Champagne', 'Service au salon', 120, 1),
  ('Boissons', 'Bière locale (Primus/Skol)', '', 4, 2),
  ('Boissons', 'Whisky (verre)', '', 10, 3),
  ('Snacks', 'Brochettes de bœuf', 'Épicées, sauce maison', 10, 1),
  ('Snacks', 'Assiette de fruits de mer', '', 18, 2)
) AS x(cat_nom, nom, description, prix, ordre) ON x.cat_nom = c.nom
WHERE c.restaurant_slug = 'lelieu';

INSERT INTO public.produits (restaurant_slug, categorie_id, nom, description, prix, ordre)
SELECT 'auspices', c.id, x.nom, x.description, x.prix, x.ordre
FROM public.categories c
JOIN (VALUES
  ('Plats Congolais', 'Liboke de poisson', 'Poisson mijoté en feuille de bananier, épices', 16, 1),
  ('Plats Congolais', 'Poulet à la moambe', 'Sauce noix de palme traditionnelle', 15, 2),
  ('Plats Congolais', 'Chikwangue & poisson salé', '', 14, 3),
  ('Accompagnements', 'Fufu', '', 4, 1),
  ('Accompagnements', 'Riz blanc', '', 3, 2),
  ('Accompagnements', 'Bananes plantains frites', '', 4, 3),
  ('Boissons', 'Jus de gingembre maison', '', 5, 1),
  ('Boissons', 'Ntaba (bière locale)', '', 4, 2)
) AS x(cat_nom, nom, description, prix, ordre) ON x.cat_nom = c.nom
WHERE c.restaurant_slug = 'auspices';

SELECT 'Base multi-tenant Vilakazi / LeLieu / Auspices créée ✅' AS status;
