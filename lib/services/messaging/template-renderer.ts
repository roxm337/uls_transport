/**
 * Template Renderer
 * Handles variable substitution in message templates
 */

import type { Client } from '@prisma/client';

export interface VariableContext {
    client?: Client | null;
    customData?: Record<string, any>;
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

export class TemplateRenderer {
    /**
     * Replace variables in template content
     * Supports: {{name}}, {{email}}, {{company}}, {{phone}}, {{data.customField}}, {{date}}, {{time}}, {{url}}
     */
    static render(template: string, context: VariableContext): string {
        let result = template;

        // Standard client variables
        if (context.client) {
            result = result.replace(/\{\{company\}\}/g, context.client.companyName || '');
            result = result.replace(/\{\{name\}\}/g, context.client.contactName || '');
            result = result.replace(/\{\{email\}\}/g, context.client.email || '');
            result = result.replace(/\{\{phone\}\}/g, context.client.phone || '');
            result = result.replace(/\{\{city\}\}/g, context.client.city || '');
        }

        // System fields
        result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString('fr-FR'));
        result = result.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString('fr-FR'));

        // Custom data from context
        if (context.customData) {
            Object.keys(context.customData).forEach(key => {
                const regex = new RegExp(`\\{\\{${this.escapeRegex(key)}\\}\\}`, 'g');
                result = result.replace(regex, String(context.customData![key] || ''));
            });
        }

        return result;
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
     * Get available variables for a given lead
     */
    static getAvailableVariables(
        client?: {
            companyName?: string | null;
            contactName?: string | null;
            email?: string | null;
            phone?: string | null;
            city?: string | null;
        } | null
    ): Record<string, string> {
        const variables: Record<string, string> = {
            date: new Date().toLocaleDateString('fr-FR'),
            time: new Date().toLocaleTimeString('fr-FR'),
        };

        if (client) {
            if (client.companyName) variables.company = client.companyName;
            if (client.contactName) variables.name = client.contactName;
            if (client.email) variables.email = client.email;
            if (client.phone) variables.phone = client.phone;
            if (client.city) variables.city = client.city;
        }

        return variables;
    }

    /**
     * Get a sample data set for template preview
     */
    static getSampleData(): Record<string, string> {
        return {
            company: 'Transports Exemple SAS',
            name: 'Jean Dupont',
            email: 'jean.dupont@example.fr',
            phone: '+33 1 69 21 00 00',
            city: 'Ris-Orangis',
            date: new Date().toLocaleDateString('fr-FR'),
            time: new Date().toLocaleTimeString('fr-FR'),
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
