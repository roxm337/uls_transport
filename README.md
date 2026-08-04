# ULS Transport — CRM

Outil interne de gestion des clients et des expéditions d'ULS Transport.
Application Next.js (App Router) + Prisma + MySQL avec console interne pour les
comptes `ADMIN` et `MANAGER`, ainsi qu'un espace client séparé pour le suivi des
expéditions et des réclamations. Le site vitrine reste sur uls-transport.com.

## Démarrage

```bash
pnpm install
# renseigner .env.local (voir « Variables d'environnement »)
pnpm db:push   # crée / synchronise le schéma
pnpm seed      # comptes internes uniquement
pnpm crm:import # contrôle à blanc de crm.xlsx
pnpm crm:import:apply # importe les clients réels
pnpm dev
```

L'application démarre sur http://localhost:3000 et redirige vers `/login`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production (`prisma generate` inclus) |
| `pnpm start` | Serveur de production |
| `pnpm db:push` | Applique `prisma/schema.prisma` à la base (dev, sans historique) |
| `pnpm db:migrate` | Applique les migrations `prisma/migrations` (**à utiliser sur une base existante**) |
| `pnpm db:migrate:status` | État des migrations |
| `pnpm db:studio` | Prisma Studio |
| `pnpm seed` | Crée ou actualise les comptes internes, sans données de démonstration |
| `pnpm crm:import` | Valide `crm.xlsx` et affiche les changements sans écrire |
| `pnpm crm:import:apply` | Remplace les clients de démonstration et importe `crm.xlsx` |
| `pnpm lint` | ESLint |

Les scripts `db:*` et `seed` chargent `.env.local` via `node --env-file`,
car la CLI Prisma ne lit que `.env`.

L'import CRM conserve tout client qui ne correspond pas aux six noms de
démonstration historiques. Les lignes du classeur sont identifiées par
`société + SIRET + ville`, afin de conserver les différents sites d'une même
entreprise. La colonne « EXPEDITIONS » ne contient que des nombres : ces
compteurs sont conservés dans les notes clients, sans créer de faux transports.

> **Sur une base qui contient déjà des données, utilisez `pnpm db:migrate`,
> pas `pnpm db:push`.** La migration `20260731120000_single_uls_messaging_config`
> déplace des données avant de supprimer des colonnes : elle reporte l'opt-in
> de chaque client vers `Client.notificationsEnabled` et rattache les
> journaux de messages à la configuration conservée. `db push` se
> contenterait de supprimer les colonnes — l'opt-in et l'historique seraient
> perdus.
>
> Une base créée par `db push` n'a pas d'historique de migrations : la
> marquer une seule fois avec
> `prisma migrate resolve --applied <nom>` pour chaque migration antérieure,
> puis `pnpm db:migrate`.

## Variables d'environnement

Tout est dans `.env.local` (ignoré par git) :

- `DATABASE_URL` — chaîne de connexion MySQL **(requis)**
- `JWT_SECRET` — signature des jetons de session, 32 caractères minimum **(requis)**
- `ENCRYPTION_KEY` — clé AES-256-GCM, exactement 64 caractères hexadécimaux **(requis)**
- `SECURE_COOKIES` — `false` pour autoriser les cookies non-HTTPS en production
- `ALLOWED_ORIGINS`, `PRODUCTION_URL` — origines acceptées par la protection
  CSRF, appliquée par le middleware à **toute** écriture `/api/*` (POST,
  PATCH, PUT, DELETE). Les deux sont cumulatives ; `PRODUCTION_URL` est
  toujours acceptée. À défaut, seule l'origine correspondant à l'en-tête
  `Host` de la requête passe — insuffisant derrière un proxy qui le réécrit,
  d'où **`PRODUCTION_URL` à renseigner en production**.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — compte administrateur créé par le seed
- `WHATSAPP_DEFAULT_COUNTRY_CODE` — indicatif par défaut (`33`), appliqué aux
  numéros saisis au format local (`06…` → `+336…`)

## Domaine

| Modèle | Rôle |
| --- | --- |
| `Client` | Donneur d'ordre : raison sociale, SIRET, adresse, statut, services souscrits, chargé de compte, notifications |
| `ClientContact` | Contacts rattachés à un client |
| `Expedition` | Transport : référence `ULS-AAAA-NNNN`, service ULS, enlèvement, livraison, marchandise, statut, prix |
| `User` | Compte interne (`ADMIN` ou `MANAGER`) |

Les libellés métier (statuts, services, couleurs) sont centralisés dans
`lib/crm.ts`, l'identité de marque dans `lib/brand.ts`.

Cycle de vie d'une expédition :
`Demandée → Planifiée → Enlevée → En transit → Livrée` (ou `Annulée`).

Chaque changement de statut est écrit dans `ExpeditionEvent` — l'historique
sert aussi de source pour la date de livraison réelle en analytique, que
`updatedAt` ne peut pas fournir (toute édition la déplace).

## Notifications automatiques

ULS Transport dispose d'**une seule** configuration d'envoi : son propre
compte SMTP et son propre numéro WhatsApp, avec lesquels elle écrit à tous
ses clients (`MessagingConfig`, ligne unique `key = "uls"`).

Créer une expédition ou changer son statut déclenche une notification, si —
et seulement si — les trois conditions suivantes sont réunies :

1. **Messagerie → Configuration** : le canal (SMTP et/ou WhatsApp) est
   renseigné *et* son envoi automatique est activé. La notification à
   l'exploitation (numéro ou groupe WhatsApp) se règle au même endroit.
2. **Fiche client** : « Notifications automatiques » est coché
   (`Client.notificationsEnabled`, désactivé par défaut). C'est le seul
   réglage de messagerie propre à un client — les identifiants, eux,
   appartiennent à ULS.
3. **Messagerie → Modèles** : il existe un modèle dont la catégorie est
   « Expédition — … ». La catégorie détermine le moment de l'envoi
   (`expedition:created`, `expedition:Livree`, …).

Résolution du modèle, du plus précis au plus général : modèle du client pour
cet événement → modèle global pour cet événement → modèle par défaut du
client → modèle par défaut global. Sans modèle, rien n'est envoyé.

Variables disponibles dans les modèles :

- Client — `{{company}}`, `{{name}}`, `{{email}}`, `{{phone}}`, `{{city}}`
- Expédition — `{{reference}}`, `{{statut}}`, `{{service}}`, `{{trajet}}`,
  `{{enlevement_ville}}`, `{{enlevement_date}}`, `{{livraison_ville}}`,
  `{{livraison_date}}`, `{{marchandise}}`, `{{colis}}`, `{{poids}}`, `{{prix}}`
- Système — `{{date}}`, `{{time}}`

Un échec d'envoi n'échoue jamais l'enregistrement de l'expédition : le
résultat est tracé dans `MessageLog` (Messagerie → Journaux).
