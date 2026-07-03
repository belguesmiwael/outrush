# OUTRUSH — Marketplace Outlet Mondiale ⏱

> L'outlet qui ressemble à du luxe, opéré comme un laboratoire.
> Scan-to-Store · Stock Intelligence · Ventes Flash chronométrées · FR/EN/AR · Multi-devises.

**Stack** : Next.js 15 App Router (JavaScript pur) · Tailwind · Supabase (Postgres/Auth/Storage/Realtime) · Stripe · Vercel · PWA.

## Démarrage

```bash
npm install
cp .env.example .env.local   # remplir les clés
npm run dev
```

## Mise en place Supabase (projet dédié)

1. Créer un projet Supabase, puis exécuter `supabase/migrations/0001_init.sql` dans le SQL Editor.
2. **Auth Hook** : Dashboard → Authentication → Hooks → *Customize Access Token (JWT)* → sélectionner la fonction `public.custom_access_token_hook`. C'est ce hook qui injecte `app_metadata.role` dans le JWT.
3. **Storage** : créer les buckets `product-media` (public) et `scan-captures` (privé).
4. **Rôles** : pour promouvoir un utilisateur, exécuter côté SQL (jamais côté client) :
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = raw_app_meta_data || '{"role":"operator"}'
   WHERE email = 'operateur@exemple.com';
   ```
   Rôles : `admin` · `operator` · `supplier` · `buyer` (défaut).
5. **Realtime** : la migration ajoute `flash_sale_items` à la publication `supabase_realtime`.

## Variables d'environnement

Voir `.env.example`. Sur Vercel : ajouter aussi `CRON_SECRET` (les crons de `vercel.json` l'envoient en `Authorization: Bearer`).

## Crons — plan Hobby vs Pro

Vercel **Hobby** limite les crons à **1 exécution / jour**. Seul `stock-classify` (quotidien) est
donc déclaré dans `vercel.json`. Les deux autres tournent plus souvent et doivent être :
- soit déclenchés **manuellement** pendant les tests (commandes ci-dessous),
- soit programmés automatiquement en passant le projet en **Pro** (voir plus bas).

Déclenchement manuel (remplacer le domaine et `$CRON_SECRET`) :

```bash
# Taux de change (idéalement toutes les 6 h en prod)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://TON-DOMAINE.vercel.app/api/cron/fx-rates

# Libération des réservations flash expirées (idéalement toutes les 10 min en prod)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://TON-DOMAINE.vercel.app/api/cron/expire-reservations

# Classification stock + moteur de packs (déjà quotidien via vercel.json,
# mais utile pour forcer un passage immédiat)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://TON-DOMAINE.vercel.app/api/cron/stock-classify
```

⚠️ `expire-reservations` doit tourner à la minute pour que les ventes flash se comportent
correctement (un panier réservé 10 min bloque le stock jusqu'à sa libération). En production
avec de vrais drops, passer en **Pro** et rétablir dans `vercel.json` :

```json
{ "path": "/api/cron/fx-rates",            "schedule": "0 */6 * * *" },
{ "path": "/api/cron/expire-reservations", "schedule": "*/10 * * * *" }
```

## Structure

- `/` boutique (rail flash + Card-Gallery) · `/flash` drops live · `/product/[slug]` fiche
- `/ops` Command-Center · `/ops/scan` scanner caméra + douchette · `/ops/scan/queue` validation 1-tap
- `/ops/stock` Stock Intelligence · `/ops/flash` drops · `/admin` · `/supplier`
- `lib/scan/enrich.js` pipeline d'enrichissement (GTIN multi-sources → prix croisé → copie IA → Storage)
- `supabase/migrations/0001_init.sql` schéma + RLS + `claim_flash_stock()` atomique

## Jalons

- ✅ **Jalon 1 — Socle** : auth+rôles, schéma+RLS, boutique, scanner + pipeline, validation, crons
- 🔜 **Jalon 2** : moteur de packs IA, fiche manuelle assistée, portail fournisseur complet
- 🔜 **Jalon 3** : checkout Stripe + réservation flash bout-en-bout, i18n routée, gamification

🔒 Secure-By-Default — RLS sur toutes les tables · rôle en `app_metadata` uniquement · prix/stock décidés serveur · réservation atomique SQL · Zod sur toutes les entrées · contenu scrappé traité comme donnée non fiable · secrets en env vars serveur.
