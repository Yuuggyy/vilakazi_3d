-- ============================================
-- FIX RLS — Autoriser l'insertion publique
-- des commandes, items et appels serveur
-- ============================================
-- À exécuter dans Supabase > SQL Editor
-- Résout l'erreur: "new row violates row-level security policy"
-- ============================================

-- 1. Commandes — insertion publique
DROP POLICY IF EXISTS "insertion_commandes" ON public.commandes;
CREATE POLICY "insertion_commandes"
  ON public.commandes FOR INSERT
  WITH CHECK (true);

-- 2. Commande items — insertion publique
DROP POLICY IF EXISTS "insertion_items" ON public.commande_items;
CREATE POLICY "insertion_items"
  ON public.commande_items FOR INSERT
  WITH CHECK (true);

-- 3. Appels serveur — insertion publique
DROP POLICY IF EXISTS "insertion_appel" ON public.appels_serveur;
CREATE POLICY "insertion_appel"
  ON public.appels_serveur FOR INSERT
  WITH CHECK (true);

-- 4. Vérifier que RLS est bien activé
ALTER TABLE public.commandes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commande_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appels_serveur  ENABLE ROW LEVEL SECURITY;

-- 5. S'assurer que les admins peuvent lire/gérer
DROP POLICY IF EXISTS "admin_read_commandes" ON public.commandes;
CREATE POLICY "admin_read_commandes"
  ON public.commandes FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

DROP POLICY IF EXISTS "admin_update_commandes" ON public.commandes;
CREATE POLICY "admin_update_commandes"
  ON public.commandes FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

DROP POLICY IF EXISTS "admin_read_items" ON public.commande_items;
CREATE POLICY "admin_read_items"
  ON public.commande_items FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

DROP POLICY IF EXISTS "admin_read_appels" ON public.appels_serveur;
CREATE POLICY "admin_read_appels"
  ON public.appels_serveur FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

DROP POLICY IF EXISTS "admin_update_appels" ON public.appels_serveur;
CREATE POLICY "admin_update_appels"
  ON public.appels_serveur FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.admin_profiles));

SELECT 'RLS policies corrigées ✅ — commandes et appels serveur maintenant publics en écriture' AS status;
