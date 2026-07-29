/**
 * Messaging Service Exports
 * Central export point for the messaging service
 */

export { MessagingService } from './messaging-service';
export { EmailService } from './email-service';
export * from './types';
export { getWhatsAppProvider, registerWhatsAppProvider, getAvailableProviders } from './providers';
export { encryptCredential, decryptCredential } from './crypto';
