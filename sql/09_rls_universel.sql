-- ============================================
-- RLS UNIVERSEL — Ouvre TOUT sauf gestion admin produits
-- À exécuter dans Supabase > SQL Editor
-- ============================================
-- Ce script garantit que:
-- ✅ Un client NON connecté peut:
--    - Lire les catégories et produits (menu)
--    - Créer des commandes + items
--    - Appeler le serveur
--    - Lire les paramètres du restaurant
-- 🔒 Seul l'admin connecté peut:
--    - Créer/modifier/supprimer produits et catégories
--    - Voir et gérer les commandes
--    - Voir et gérer les appels serveur
--    - Modifier les paramètres
-- ============================================

-- ═══════════════════════════════════════
-- 1. CATÉGORIES — Lecture publique, écriture admin only
-- ═══════════════════════════════════════
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lecture_publique_categories" ON public.categories;
DROP POLICY IF EXISTS "admin_all_categories" ON public.categories;

-- Tout le monde peut lire
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (true);

-- Seul l'admin peut écrire
CREATE POLICY "categories_insert_admin" ON public.categories FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "categories_update_admin" ON public.categories FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "categories_delete_admin" ON public.categories FOR DELETE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

-- ═══════════════════════════════════════
-- 2. PRODUITS — Lecture publique, écriture admin only
-- ═══════════════════════════════════════
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lecture_publique_produits" ON public.produits;
DROP POLICY IF EXISTS "admin_all_produits" ON public.produits;

-- Tout le monde peut lire
CREATE POLICY "produits_select_all" ON public.produits FOR SELECT USING (true);

-- Seul l'admin peut écrire
CREATE POLICY "produits_insert_admin" ON public.produits FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "produits_update_admin" ON public.produits FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "produits_delete_admin" ON public.produits FOR DELETE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

-- ═══════════════════════════════════════
-- 3. COMMANDES — Insertion publique, lecture admin only
-- ═══════════════════════════════════════
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insertion_commandes" ON public.commandes;
DROP POLICY IF EXISTS "admin_read_commandes" ON public.commandes;
DROP POLICY IF EXISTS "admin_update_commandes" ON public.commandes;
DROP POLICY IF EXISTS "admin_all_commandes" ON public.commandes;

-- Tout le monde peut créer des commandes (clients anonymes)
CREATE POLICY "commandes_insert_all" ON public.commandes FOR INSERT WITH CHECK (true);

-- Seul l'admin peut lire et modifier
CREATE POLICY "commandes_select_admin" ON public.commandes FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "commandes_update_admin" ON public.commandes FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

-- ═══════════════════════════════════════
-- 4. COMMANDE ITEMS — Insertion publique, lecture admin only
-- ═══════════════════════════════════════
ALTER TABLE public.commande_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insertion_items" ON public.commande_items;
DROP POLICY IF EXISTS "admin_read_items" ON public.commande_items;
DROP POLICY IF EXISTS "admin_all_items" ON public.commande_items;

-- Tout le monde peut créer des items de commande
CREATE POLICY "items_insert_all" ON public.commande_items FOR INSERT WITH CHECK (true);

-- Seul l'admin peut lire
CREATE POLICY "items_select_admin" ON public.commande_items FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

-- ═══════════════════════════════════════
-- 5. APPELS SERVEUR — Insertion publique, gestion admin only
-- ═══════════════════════════════════════
ALTER TABLE public.appels_serveur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insertion_appel" ON public.appels_serveur;
DROP POLICY IF EXISTS "admin_read_appels" ON public.appels_serveur;
DROP POLICY IF EXISTS "admin_update_appels" ON public.appels_serveur;
DROP POLICY IF EXISTS "admin_all_appels" ON public.appels_serveur;

-- Tout le monde peut appeler le serveur
CREATE POLICY "appels_insert_all" ON public.appels_serveur FOR INSERT WITH CHECK (true);

-- Seul l'admin peut lire et traiter
CREATE POLICY "appels_select_admin" ON public.appels_serveur FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));
CREATE POLICY "appels_update_admin" ON public.appels_serveur FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

-- ═══════════════════════════════════════
-- 6. PARAMÈTRES — Lecture publique, écriture admin only
-- ═══════════════════════════════════════
ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parametres_select_all" ON public.parametres;
DROP POLICY IF EXISTS "parametres_update_admin" ON public.parametres;
DROP POLICY IF EXISTS "admin_all_parametres" ON public.parametres;

-- Tout le monde peut lire les paramètres (logo, adresse, etc.)
CREATE POLICY "parametres_select_all" ON public.parametres FOR SELECT USING (true);

-- Seul l'admin peut modifier
CREATE POLICY "parametres_update_admin" ON public.parametres FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

-- ═══════════════════════════════════════
-- 7. ADMIN PROFILES — Admin only
-- ═══════════════════════════════════════
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_profiles_policy" ON public.admin_profiles;

CREATE POLICY "admin_profiles_select_own" ON public.admin_profiles FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() = id);
CREATE POLICY "admin_profiles_update_own" ON public.admin_profiles FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() = id);

-- ═══════════════════════════════════════
-- 8. STORAGE — Bucket menu-images public en lecture
-- ═══════════════════════════════════════
-- Les images uploadées doivent être lisibles par tous
DO $$
BEGIN
  -- Policy lecture publique sur le bucket menu-images
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'menu-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);
  END IF;
END $$;

-- Lecture publique des fichiers du bucket
DROP POLICY IF EXISTS "menu_images_select_all" ON storage.objects;
CREATE POLICY "menu_images_select_all" ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Upload: admin only
DROP POLICY IF EXISTS "menu_images_insert_admin" ON storage.objects;
CREATE POLICY "menu_images_insert_admin" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles)));

-- Update/delete: admin only
DROP POLICY IF EXISTS "menu_images_update_admin" ON storage.objects;
CREATE POLICY "menu_images_update_admin" ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles)));

DROP POLICY IF EXISTS "menu_images_delete_admin" ON storage.objects;
CREATE POLICY "menu_images_delete_admin" ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles)));

SELECT 'RLS universel configuré ✅ — Clients anonymes peuvent commander et appeler le serveur. Admin gère les produits.' AS status;
