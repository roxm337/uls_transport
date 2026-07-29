/**
 * Core types and interfaces for the messaging service
 */

// Common types
export interface MessageResult {
    success: boolean;
    error?: string;
    messageId?: string;
    details?: any;
}

export interface EmailConfig {
    id: string;
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: 'TLS' | 'SSL';
    fromName: string;
    fromEmail: string;
    autoSend: boolean;
}

export interface WhatsAppConfig {
    id: string;
    provider: string;
    apiKey: string;
    apiUrl?: string;
    autoSend: boolean;
    timeout: number;
    template?: string; // New: template for the scope
}

export interface EmailMessage {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
}

export interface WhatsAppMessage {
    to: string;
    text: string;
    template?: string;
    /**
     * Explicitly indicate if text is the complete message (true) or just a name for template (false/undefined)
     * - true: Send text as-is without wrapping in any template
     * - false/undefined: Legacy behavior - may wrap short texts in default template
     */
    isFullMessage?: boolean;
}

// Service interfaces
export interface IEmailService {
    send(message: EmailMessage, config: EmailConfig): Promise<MessageResult>;
    validateConfig(config: EmailConfig): Promise<boolean>;
}

export interface IWhatsAppProvider {
    send(message: WhatsAppMessage, config: WhatsAppConfig): Promise<MessageResult>;
    validateConfig(config: WhatsAppConfig): Promise<boolean>;
    getName(): string;
}

export interface IMessagingService {
    sendEmail(message: EmailMessage, scopeId?: string): Promise<MessageResult>;
    sendWhatsApp(message: WhatsAppMessage, scopeId?: string): Promise<MessageResult>;
    getConfig(scopeId: string): Promise<any>;
    updateConfig(scopeId: string, type: string, config: any): Promise<void>;
}
