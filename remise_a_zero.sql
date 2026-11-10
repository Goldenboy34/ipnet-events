-- =====================================================================
-- IPNET Events : REMISE À NEUF avant le lancement officiel
-- Efface : commandes, billets, alertes, journal, comptes de test.
-- GARDE : les comptes administrateurs et les événements.
-- ATTENTION : irréversible. À lancer une seule fois, juste avant l'ouverture.
-- =====================================================================
delete from public.tickets;
delete from public.orders;
delete from public.alerts;
truncate table public.admin_log restart identity;

-- Supprime tous les comptes sauf les administrateurs (les profils partent avec)
delete from auth.users
 where id not in (select id from public.profiles where role = 'admin');

-- Pour effacer aussi les événements de test, décommente la ligne suivante :
-- delete from public.events;

-- Les anciennes captures de paiement (dossier "proofs") ne s'effacent pas par SQL :
-- Supabase > Storage > proofs > tout sélectionner > Delete.
