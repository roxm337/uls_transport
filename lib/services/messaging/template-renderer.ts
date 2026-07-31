/**
 * Template Renderer
 * Handles variable substitution in message templates
 */

import type { Client, Expedition } from '@prisma/client';
import { expeditionStatusLabel, serviceLabel, formatEuros } from '@/lib/crm';

export interface VariableContext {
    client?: Client | null;
    /**
     * The shipment a notification is about. Without it a transport template
     * can only say "hello" — it cannot name the reference it concerns.
     */
    expedition?: Expedition | null;
    customData?: Record<string, unknown>;
}

export const STANDARD_VARIABLES = {
    // Client fields
    company: 'Raison sociale du client',
    name: 'Nom du contact',
    email: 'Adresse e-mail',
    phone: 'Téléphone',
    city: 'Ville',

    // System fields
    date: 'Date du jour',
    time: 'Heure',
} as const;

/** Only resolvable when the message concerns a shipment. */
export const EXPEDITION_VARIABLES = {
    reference: 'Référence ULS (ex. ULS-2026-0042)',
    statut: 'Statut de l\'expédition',
    service: 'Service ULS',
    enlevement_ville: 'Ville d\'enlèvement',
    enlevement_date: 'Date d\'enlèvement',
    livraison_ville: 'Ville de livraison',
    livraison_date: 'Date de livraison',
    trajet: 'Trajet, ex. « Rungis → Lyon »',
    marchandise: 'Description de la marchandise',
    colis: 'Nombre de colis / palettes',
    poids: 'Poids en kg',
    prix: 'Prix HT',
} as const;

/** fr-FR short date, or an empty string when the field is unset. */
function frDate(value: Date | null): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('fr-FR');
}

export class TemplateRenderer {
    /**
     * Replace variables in template content.
     *
     * Supports the client fields ({{company}}, {{name}}, …), the shipment
     * fields ({{reference}}, {{statut}}, …), {{date}}/{{time}} and anything
     * passed in `customData`.
     */
    static render(template: string, context: VariableContext): string {
        let result = template;

        const substitutions: Record<string, string> = {
            ...this.clientVariables(context.client),
            ...this.expeditionVariables(context.expedition),
            date: new Date().toLocaleDateString('fr-FR'),
            time: new Date().toLocaleTimeString('fr-FR'),
        };

        // Custom data wins: a caller passing an explicit value means it.
        if (context.customData) {
            Object.entries(context.customData).forEach(([key, value]) => {
                substitutions[key] = value === null || value === undefined ? '' : String(value);
            });
        }

        Object.entries(substitutions).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{\\s*${this.escapeRegex(key)}\\s*\\}\\}`, 'g');
            result = result.replace(regex, value);
        });

        return result;
    }

    /** Client fields as `{{variable}} → value`, empty object when absent. */
    private static clientVariables(client?: Client | null): Record<string, string> {
        if (!client) return {};
        return {
            company: client.companyName || '',
            name: client.contactName || '',
            email: client.email || '',
            phone: client.phone || '',
            city: client.city || '',
        };
    }

    /** Shipment fields as `{{variable}} → value`, empty object when absent. */
    private static expeditionVariables(expedition?: Expedition | null): Record<string, string> {
        if (!expedition) return {};

        const trajet = [expedition.pickupCity, expedition.deliveryCity]
            .filter(Boolean)
            .join(' → ');

        return {
            reference: expedition.reference,
            statut: expeditionStatusLabel(expedition.status),
            service: serviceLabel(expedition.service),
            enlevement_ville: expedition.pickupCity || '',
            enlevement_date: frDate(expedition.pickupDate),
            livraison_ville: expedition.deliveryCity || '',
            livraison_date: frDate(expedition.deliveryDate),
            trajet,
            marchandise: expedition.goodsDescription || '',
            colis: expedition.packages?.toString() ?? '',
            poids: expedition.weightKg ? `${expedition.weightKg} kg` : '',
            prix: expedition.priceHt === null ? '' : formatEuros(Number(expedition.priceHt)),
        };
    }

    /**
     * Extract all variables used in a template
     * Returns array of variable names without the {{}} delimiters
     */
    static extractVariables(template: string): string[] {
        const matches = template.match(/\{\{([^}]+)\}\}/g);
        if (!matches) return [];
        return matches.map(m => m.replace(/\{\{|\}\}/g, '').trim());
    }

    /**
     * Validate that all variables in template are available
     */
    static validate(template: string, availableVars: string[]): {
        valid: boolean;
        missing: string[];
    } {
        const used = this.extractVariables(template);
        const missing = used.filter(v => !availableVars.includes(v));
        return { valid: missing.length === 0, missing };
    }

    /**
     * The values a preview should show for a given client. Shipment fields
     * fall back to the sample set: a template is written before it is bound
     * to any particular shipment.
     */
    static getAvailableVariables(
        client?: Client | null,
        expedition?: Expedition | null
    ): Record<string, string> {
        const sample = this.getSampleData();

        return {
            ...sample,
            ...this.clientVariables(client),
            ...(expedition ? this.expeditionVariables(expedition) : {}),
            date: new Date().toLocaleDateString('fr-FR'),
            time: new Date().toLocaleTimeString('fr-FR'),
        };
    }

    /**
     * Get a sample data set for template preview
     */
    static getSampleData(): Record<string, string> {
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        return {
            company: 'Transports Exemple SAS',
            name: 'Jean Dupont',
            email: 'jean.dupont@example.fr',
            phone: '+33 1 69 21 00 00',
            city: 'Ris-Orangis',
            date: today.toLocaleDateString('fr-FR'),
            time: today.toLocaleTimeString('fr-FR'),

            // Shipment sample, so an expedition template previews as it sends
            reference: `ULS-${today.getFullYear()}-0042`,
            statut: 'En transit',
            service: 'Messagerie nationale et internationale',
            enlevement_ville: 'Rungis',
            enlevement_date: today.toLocaleDateString('fr-FR'),
            livraison_ville: 'Lyon',
            livraison_date: tomorrow.toLocaleDateString('fr-FR'),
            trajet: 'Rungis → Lyon',
            marchandise: '3 palettes EUR filmées, non gerbables',
            colis: '3',
            poids: '850 kg',
            prix: '480,00 €',
        };
    }

    /**
     * Escape special regex characters in a string
     */
    private static escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * HTML escape for email templates (prevents XSS)
     */
    static htmlEscape(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Convert text template to HTML (for email)
     */
    static textToHtml(text: string): string {
        // Replace newlines with <br> and wrap in paragraph
        return `<p>${text.replace(/\n/g, '<br>')}</p>`;
    }
}
