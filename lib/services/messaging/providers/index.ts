/**
 * WhatsApp Provider Registry
 * Allows registration and retrieval of WhatsApp providers
 */

import { IWhatsAppProvider } from '../types';
import { WasenderProvider } from './wasender-provider';

// Provider registry
const providers = new Map<string, IWhatsAppProvider>();

// Register default providers
providers.set('wasender', new WasenderProvider());

/**
 * Get a WhatsApp provider by name
 * @param name - Provider name (e.g., 'wasender')
 * @returns Provider instance or undefined if not found
 */
export function getWhatsAppProvider(name: string): IWhatsAppProvider | undefined {
    return providers.get(name);
}

/**
 * Register a new WhatsApp provider
 * @param provider - Provider instance implementing IWhatsAppProvider
 */
export function registerWhatsAppProvider(provider: IWhatsAppProvider): void {
    providers.set(provider.getName(), provider);
    console.log(`[ProviderRegistry] Registered WhatsApp provider: ${provider.getName()}`);
}

/**
 * Get all registered provider names
 * @returns Array of provider names
 */
export function getAvailableProviders(): string[] {
    return Array.from(providers.keys());
}
