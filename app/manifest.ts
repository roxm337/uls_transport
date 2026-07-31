import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/**
 * Web app manifest.
 *
 * `public/pwa-192.png` and `pwa-512.png` were named for a PWA but only ever
 * wired as favicons — there was no manifest, so the CRM could not be
 * installed. Half the work happens on a phone at the quai, where an icon on
 * the home screen and a standalone window (no browser chrome eating vertical
 * space) is the difference between a tool and a bookmark.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: `${BRAND.name} — CRM`,
        short_name: 'ULS CRM',
        description:
            "Outil interne ULS Transport : gestion des clients, des contacts et des expéditions.",
        // Sign-in is the entry point; the middleware forwards an authenticated
        // session on to /admin.
        start_url: '/login',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        // ULS ink, matching the root layout's themeColor.
        theme_color: '#0a0a0a',
        lang: 'fr',
        dir: 'ltr',
        categories: ['business', 'productivity'],
        icons: [
            {
                src: '/pwa-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/pwa-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            // `maskable` lets Android crop the icon to its own shape instead
            // of dropping the square into a white circle.
            {
                src: '/pwa-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
