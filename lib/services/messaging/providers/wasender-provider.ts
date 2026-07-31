/**
 * WasenderAPI Provider Implementation
 * Refactored from the original wasender.ts service
 */

import { IWhatsAppProvider, WhatsAppMessage, WhatsAppConfig, MessageResult } from '../types';
import { errorMessage } from '@/lib/errors';

const REQUEST_TIMEOUT = 10000; // 10 seconds

// Default country code for local phone number conversion
// Can be overridden via WHATSAPP_DEFAULT_COUNTRY_CODE env variable.
// 33 = France: ULS Transport operates from Ris-Orangis, and a local number
// typed as 06… must normalise to +336…, not to another country's prefix.
const DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '33';

/**
 * Last-resort message body, used only when a caller passes neither a
 * template nor `isFullMessage`.
 *
 * It used to be a marketing script for an unrelated agency, complete with
 * their booking link — anything falling through to it was sending a client
 * of ULS Transport someone else's sales pitch. It now says the minimum a
 * transporter can honestly say, and callers that mean something specific
 * pass their own text.
 */
const DEFAULT_MESSAGE_TEMPLATE = `Bonjour {{name}},

Une mise à jour concerne votre transport. Notre exploitation revient vers vous.

Bien cordialement,
ULS Transport`;

/**
 * Phone number validation result
 */
interface PhoneValidationResult {
    isValid: boolean;
    error?: string;
    normalized?: string;
}

export class WasenderProvider implements IWhatsAppProvider {
    getName(): string {
        return 'wasender';
    }

    async validateConfig(config: WhatsAppConfig): Promise<boolean> {
        // Validate API key and URL are present
        if (!config.apiKey) {
            console.error('[WasenderProvider] API key is missing');
            return false;
        }

        if (!config.apiUrl) {
            console.error('[WasenderProvider] API URL is missing');
            return false;
        }

        return true;
    }

    async send(message: WhatsAppMessage, config: WhatsAppConfig): Promise<MessageResult> {
        // Validate config
        const isValid = await this.validateConfig(config);
        if (!isValid) {
            return {
                success: false,
                error: 'Invalid configuration',
            };
        }

        // Validate phone number
        const phoneValidation = this.validatePhoneNumber(message.to);
        if (!phoneValidation.isValid) {
            console.error('[WasenderProvider] Phone validation failed:', phoneValidation.error);
            return {
                success: false,
                error: phoneValidation.error,
            };
        }

        // Format message
        // Priority:
        // 1. If template is provided, use it with text as {{name}} value
        // 2. If isFullMessage is true, send text as-is (for manual messages and rendered templates)
        // 3. Legacy fallback: treat text as a name and wrap in default template
        let formattedMessage: string;
        if (message.template) {
            // Use provided template with text as the name value
            formattedMessage = this.formatMessage(message.template, message.text);
        } else if (message.isFullMessage) {
            // Explicit full message - send as-is (manual sends, rendered templates)
            formattedMessage = message.text;
        } else {
            // Legacy behavior: treat text as a name for backward compatibility
            // This is used when no template is configured and isFullMessage is not set
            formattedMessage = this.formatMessage(DEFAULT_MESSAGE_TEMPLATE, message.text);
            console.log('[WasenderProvider] Using default template (no template configured, isFullMessage not set)');
        }

        console.log('[WasenderProvider] Preparing to send WhatsApp message:', {
            to: phoneValidation.normalized,
            messageLength: formattedMessage.length,
        });

        try {
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            // Make API request
            const response = await fetch(config.apiUrl!, { // Added '!' to assert non-null/undefined
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: phoneValidation.normalized,
                    text: formattedMessage,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Parse response
            const responseData = await response.json().catch(() => ({}));

            // Check if request was successful
            if (!response.ok) {
                console.error('[WasenderProvider] API request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    response: responseData,
                });

                return {
                    success: false,
                    error: `API error: ${response.status} ${response.statusText}`,
                    details: responseData,
                };
            }

            // Success!
            console.log('[WasenderProvider] Message sent successfully:', {
                to: phoneValidation.normalized,
                response: responseData,
            });

            return {
                success: true,
                messageId: responseData.id || responseData.messageId,
                details: responseData,
            };

        } catch (error) {
            // Handle different error types
            if (error instanceof Error && error.name === 'AbortError') {
                console.error('[WasenderProvider] Request timeout after 10 seconds');
                return {
                    success: false,
                    error: 'Request timeout',
                };
            }

            if (typeof error === 'object' && error !== null && 'code' in error
                && (error as { code?: string }).code === 'ECONNREFUSED') {
                console.error('[WasenderProvider] Connection refused - API may be down');
                return {
                    success: false,
                    error: 'Connection refused',
                };
            }

            // Generic error
            console.error('[WasenderProvider] Unexpected error:', error);
            return {
                success: false,
                error: errorMessage(error, 'Unknown error'),
            };
        }
    }

    /**
     * Validates and normalizes a phone number for WhatsApp
     *
     * Requirements:
     * - Should contain only digits after normalization
     * - Length should be between 9-15 digits (after country code conversion)
     *
     * Features:
     * - Automatically converts local format (0xxx) to international format
     * - Uses DEFAULT_COUNTRY_CODE for conversion (configurable via env)
     */
    private validatePhoneNumber(phone: string | null | undefined): PhoneValidationResult {
        if (!phone) {
            return {
                isValid: false,
                error: 'Phone number is required',
            };
        }

        // Remove common formatting characters
        let normalized = phone.replace(/[\s\-\(\)\.]/g, '');

        // Check if it contains only digits (and optionally a leading +)
        const hasValidChars = /^[\+]?\d+$/.test(normalized);
        if (!hasValidChars) {
            return {
                isValid: false,
                error: 'Phone number contains invalid characters',
            };
        }

        // Remove leading + if present
        normalized = normalized.replace(/^\+/, '');

        // Convert local format (starting with 0) to international format
        if (normalized.startsWith('0')) {
            const localNumber = normalized.substring(1); // Remove the leading 0
            normalized = DEFAULT_COUNTRY_CODE + localNumber;
            console.log(`[WasenderProvider] Converted local phone ${phone} to international format: ${normalized}`);
        }

        // Check length (international format: 10-15 digits)
        if (normalized.length < 10 || normalized.length > 15) {
            return {
                isValid: false,
                error: `Phone number must be between 10-15 digits (got ${normalized.length})`,
            };
        }

        return {
            isValid: true,
            normalized,
        };
    }

    /**
     * Send a WhatsApp message to a group (staff notification)
     * Group ID format accepted: raw group ID or with @g.us suffix
     */
    async sendToGroup(groupId: string, message: string, config: WhatsAppConfig): Promise<MessageResult> {
        const isValid = await this.validateConfig(config);
        if (!isValid) {
            return { success: false, error: 'Invalid configuration' };
        }

        if (!groupId) {
            return { success: false, error: 'Group ID is required' };
        }

        // Normalize group ID — WaSender expects the format "XXXXXXXXXX-XXXXXXXXXX@g.us"
        const normalizedGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;

        console.log('[WasenderProvider] Sending group notification:', {
            groupId: normalizedGroupId,
            messageLength: message.length,
        });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(config.apiUrl!, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: normalizedGroupId,
                    text: message,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                console.error('[WasenderProvider] Group send failed:', {
                    status: response.status,
                    response: responseData,
                });
                return {
                    success: false,
                    error: `API error: ${response.status} ${response.statusText}`,
                    details: responseData,
                };
            }

            console.log('[WasenderProvider] Group message sent successfully:', { groupId: normalizedGroupId });
            return {
                success: true,
                messageId: responseData.id || responseData.messageId,
                details: responseData,
            };
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return { success: false, error: 'Request timeout' };
            }
            console.error('[WasenderProvider] Unexpected group send error:', error);
            return { success: false, error: errorMessage(error, 'Unknown error') };
        }
    }

    /**
     * Formats a message template by replacing placeholders
     * If template is provided, use it; otherwise use the text directly
     */
    private formatMessage(template: string, text: string): string {
        // If template contains placeholders, replace them
        if (template.includes('{{')) {
            // Replace {{name}} with the provided text (usually the lead's name)
            return template.replace(/\{\{name\}\}/g, text || 'there');
        }

        // Otherwise, return the text as-is
        return text;
    }
}
