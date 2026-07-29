/**
 * ULS Transport brand constants.
 *
 * Single source of truth for the company identity used across the marketing
 * site, the CRM shell, transactional e-mail and legal pages. Change it here.
 */

export const BRAND = {
  name: 'ULS Transport',
  legalName: 'ULS TEAM',
  tagline: "Transporte votre image à l'international",
  shortDescription:
    "Société de transport routier en Île-de-France, spécialisée dans le transport express national et international.",

  logo: '/uls-logo.png',

  contact: {
    email: 'contact@uls-transports.com',
    operationsEmail: 'exploitation@uls-transport.com',
    phone: '+33 1 69 21 00 00',
    phoneHref: 'tel:+33169210000',
    address: {
      street: '28 Avenue Paul Langevin',
      postalCode: '91130',
      city: 'Ris-Orangis',
      country: 'France',
    },
  },

  site: 'https://uls-transport.com'
} as const;

/** The nine services ULS Transport operates. */
export const SERVICES = [
  {
    slug: 'messagerie-nationale-internationale',
    title: 'Messagerie nationale et internationale',
    description:
      'Envoyez vos palettes et autres matériels partout en France et en Europe, avec ou sans rupture de charge.',
  },
  {
    slug: 'transport-urgent',
    title: 'Transport urgent',
    description:
      'Enlèvement immédiat pour une livraison sans détour, avec un véhicule lourd ou léger qui vous est spécialement dédié.',
  },
  {
    slug: 'vehicules-avec-chauffeurs',
    title: 'Véhicules avec chauffeurs',
    description:
      'À la journée ou à la demi-journée, avec ou sans manutentionnaire : des formules souples et adaptées à vos besoins.',
  },
  {
    slug: 'tournees-regulieres',
    title: 'Tournées régulières',
    description:
      'Mise en place de liaisons régulières avec tout type de véhicule, planifiées sur vos cadences.',
  },
  {
    slug: 'transport-frigorifique',
    title: 'Transport de marchandises frigorifiées',
    description:
      'Le transport frigorifique assure la bonne conservation de vos produits frais et garantit la livraison dans les délais impartis.',
  },
  {
    slug: 'plateaux-bras-de-grue',
    title: 'Plateaux / bras de grue',
    description:
      "Mise à disposition de plateaux et de bras de grue sur toute la Région Parisienne, avec opérateur qualifié.",
  },
  {
    slug: 'demenagement',
    title: 'Déménagement',
    description:
      'Nos équipes, spécialement formées à ce type de transfert, interviennent avec rapidité et efficacité selon vos besoins.',
  },
  {
    slug: 'benne-aluminium-acier',
    title: 'Benne aluminium ou acier',
    description:
      'Transport de vracs et de matériaux en benne aluminium ou acier, avec des équipes formées à ce type de transfert.',
  },
  {
    slug: 'citernes-pulverulentes',
    title: 'Citernes pulvérulentes et basculantes',
    description:
      'Acheminement de produits pulvérulents en citerne, dans le respect strict des normes de sécurité.',
  },
] as const;
