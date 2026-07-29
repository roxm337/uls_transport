# ULS Transport — CRM

Outil interne de gestion des clients et des expéditions d'ULS Transport.
Application Next.js (App Router) + Prisma + MySQL, accessible uniquement aux
comptes `ADMIN` et `MANAGER`. Il n'y a pas d'espace client ni de site public :
le site vitrine reste sur uls-transport.com.

## Démarrage

```bash
pnpm install
# renseigner .env.local (voir « Variables d'environnement »)
pnpm db:push   # crée / synchronise le schéma
pnpm seed      # comptes + jeu de données de démonstration
pnpm dev
```

L'application démarre sur http://localhost:3000 et redirige vers `/login`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production (`prisma generate` inclus) |
| `pnpm start` | Serveur de production |
| `pnpm db:push` | Applique `prisma/schema.prisma` à la base |
| `pnpm db:studio` | Prisma Studio |
| `pnpm seed` | Peuple la base (voir `prisma/seed.ts`) |
| `pnpm lint` | ESLint |

Les scripts `db:*` et `seed` chargent `.env.local` via `node --env-file`,
car la CLI Prisma ne lit que `.env`.

## Variables d'environnement

Tout est dans `.env.local` (ignoré par git) :

- `DATABASE_URL` — chaîne de connexion MySQL **(requis)**
- `JWT_SECRET` — signature des jetons de session, 32 caractères minimum **(requis)**
- `ENCRYPTION_KEY` — clé AES-256-GCM, exactement 64 caractères hexadécimaux **(requis)**
- `SECURE_COOKIES` — `false` pour autoriser les cookies non-HTTPS en production
- `ALLOWED_ORIGINS`, `PRODUCTION_URL` — origines acceptées par la protection CSRF
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — compte administrateur créé par le seed
- `WHATSAPP_DEFAULT_COUNTRY_CODE` — indicatif par défaut (`33`)

## Domaine

| Modèle | Rôle |
| --- | --- |
| `Client` | Donneur d'ordre : raison sociale, SIRET, adresse, statut, services souscrits |
| `ClientContact` | Contacts rattachés à un client |
| `Expedition` | Transport : référence `ULS-AAAA-NNNN`, service ULS, enlèvement, livraison, marchandise, statut, prix |
| `User` | Compte interne (`ADMIN` ou `MANAGER`) |

Les libellés métier (statuts, services, couleurs) sont centralisés dans
`lib/crm.ts`, l'identité de marque dans `lib/brand.ts`.

Cycle de vie d'une expédition :
`Demandée → Planifiée → Enlevée → En transit → Livrée` (ou `Annulée`).
