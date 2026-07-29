/**
 * Encryption utilities for sensitive credentials
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

// Get encryption key from environment or use default (should be 32 bytes hex = 64 chars)
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a credential string
 * @param text - Plain text credential to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encryptCredential(text: string): string {
    if (!text) return '';

    try {
        // Generate random IV (16 bytes for AES)
        const iv = crypto.randomBytes(16);

        // Create cipher
        const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get auth tag for GCM mode
        const authTag = cipher.getAuthTag();

        // Return combined string: iv:authTag:encrypted
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('[Crypto] Encryption failed:', error);
        throw new Error('Failed to encrypt credential');
    }
}

/**
 * Decrypts a credential string
 * @param encryptedText - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export function decryptCredential(encryptedText: string): string {
    if (!encryptedText) return '';

    try {
        // Split the encrypted string
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted format');
        }

        const [ivHex, authTagHex, encrypted] = parts;

        // Create decipher
        const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        // Set auth tag
        const authTag = Buffer.from(authTagHex, 'hex');
        decipher.setAuthTag(authTag);

        // Decrypt
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[Crypto] Decryption failed:', error);
        throw new Error('Failed to decrypt credential');
    }
}
