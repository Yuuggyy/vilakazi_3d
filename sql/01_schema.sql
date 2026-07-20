-- ============================================
-- MENU 3D RESTAURANT — SCHÉMA COMPLET
-- ============================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Catégories de menu ──
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL,
  description TEXT,
  emoji       TEXT DEFAULT '🍽️',
  ordre       INTEGER DEFAULT 0,
  actif       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Produits ──
CREATE TABLE public.produits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categorie_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  nom          TEXT NOT NULL,
  description  TEXT,
  prix         NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url    TEXT,
  disponible   BOOLEAN DEFAULT true,
  ordre        INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Commandes ──
CREATE TABLE public.commandes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id UUID NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE,
  produit_id  UUID REFERENCES public.produits(id) ON DELETE SET NULL,
  nom_produit TEXT NOT NULL,
  prix_unit   NUMERIC(10,2) NOT NULL,
  quantite    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Appels serveur ──
CREATE TABLE public.appels_serveur (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_table TEXT NOT NULL,
  message      TEXT DEFAULT 'Un client demande le serveur',
  traite       BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Profils admin ──
CREATE TABLE public.admin_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  nom        TEXT,
  role       TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Trigger updated_at ──
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_produits_updated_at
  BEFORE UPDATE ON public.produits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_commandes_updated_at
  BEFORE UPDATE ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger profil admin à l'inscription ──
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_profiles (id, email, nom)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', 'Admin')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin();

-- ── RLS ──
ALTER TABLE public.categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commandes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commande_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appels_serveur  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles  ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour menu (catégories + produits)
CREATE POLICY "lecture_publique_categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "lecture_publique_produits"   ON public.produits   FOR SELECT USING (true);

-- Commandes : insertion publique, lecture admin uniquement
CREATE POLICY "insertion_commandes"    ON public.commandes      FOR INSERT WITH CHECK (true);
CREATE POLICY "insertion_items"        ON public.commande_items FOR INSERT WITH CHECK (true);
CREATE POLICY "insertion_appel"        ON public.appels_serveur FOR INSERT WITH CHECK (true);

-- Admin : accès total via service role
CREATE POLICY "admin_all_categories"     ON public.categories      FOR ALL USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "admin_all_produits"       ON public.produits        FOR ALL USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "admin_read_commandes"     ON public.commandes       FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "admin_update_commandes"   ON public.commandes       FOR UPDATE USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "admin_read_items"         ON public.commande_items  FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "admin_read_appels"        ON public.appels_serveur  FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "admin_update_appels"      ON public.appels_serveur  FOR UPDATE USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "admin_profiles_policy"    ON public.admin_profiles  FOR ALL USING (auth.role() = 'service_role' OR auth.uid() = id);

-- ── Données de démo ──
INSERT INTO public.categories (nom, emoji, ordre) VALUES
  ('Entrées',   '🥗', 1),
  ('Plats',     '🍖', 2),
  ('Desserts',  '🍰', 3),
  ('Boissons',  '🥤', 4);

SELECT 'Schéma Menu 3D créé avec succès ✅' AS status;
