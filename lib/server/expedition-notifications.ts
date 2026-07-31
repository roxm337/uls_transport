import { prisma } from '@/lib/db';
import { MessagingService } from '@/lib/services/messaging';
import { TemplateRenderer } from '@/lib/services/messaging/template-renderer';
import { expeditionTemplateCategory, expeditionStatusLabel } from '@/lib/crm';
import { BRAND } from '@/lib/brand';
import type { Client, Expedition, MessageTemplate } from '@prisma/client';

/**
 * Automatic notification of a shipment's life.
 *
 * The messaging subsystem had every piece of this except the trigger: the
 * configuration screen offers "envoi automatique" switches for e-mail and
 * WhatsApp and a staff-notification block, MessagingService honours an
 * `isAuto` flag against those switches — and nothing in the application
 * ever set it. The switches were decorative and the shipment lifecycle was
 * silent. This module is the missing caller.
 *
 * Nothing here throws: a shipment must be saved whether or not its
 * notification goes out. Failures are recorded in MessageLog by the
 * messaging service, and on the console.
 */

export type ExpeditionEventKind = 'created' | 'status';

interface NotifyInput {
    expeditionId: string;
    kind: ExpeditionEventKind;
    /** Status the shipment moved away from; absent on creation. */
    previousStatus?: string | null;
}

export interface NotifyOutcome {
    emailSent: boolean;
    whatsappSent: boolean;
    staffNotified: boolean;
    /** Why nothing was sent, when nothing was. */
    skipped?: string;
}

const NOTHING: NotifyOutcome = {
    emailSent: false,
    whatsappSent: false,
    staffNotified: false,
};

/**
 * How long a caller waits for the notification before giving up on
 * reporting its result.
 *
 * The SMTP transport allows itself 60s to connect, so awaiting it without a
 * bound would let one unreachable mail server hold a shipment's save open
 * for a minute. Past this point the send carries on in the background — its
 * real outcome lands in MessageLog either way — and the caller is simply
 * told it doesn't know yet.
 */
const REPORT_TIMEOUT_MS = 10_000;

/**
 * Send whatever the client's configuration says should go out for this
 * event. Safe to call and forget: it never throws and never blocks the
 * caller for more than REPORT_TIMEOUT_MS.
 */
export async function notifyExpedition(input: NotifyInput): Promise<NotifyOutcome> {
    const work = run(input).catch(error => {
        console.error('[ExpeditionNotifications] Unexpected failure:', error);
        return { ...NOTHING, skipped: 'unexpected-error' };
    });

    const timeout = new Promise<NotifyOutcome>(resolve => {
        setTimeout(() => resolve({ ...NOTHING, skipped: 'still-sending' }), REPORT_TIMEOUT_MS)
            // Don't hold the process open for a timer nobody is waiting on.
            .unref?.();
    });

    return Promise.race([work, timeout]);
}

async function run({ expeditionId, kind, previousStatus }: NotifyInput): Promise<NotifyOutcome> {
    const expedition = await prisma.expedition.findUnique({
        where: { id: expeditionId },
        include: {
            client: {
                include: {
                    contacts: { where: { isPrimary: true }, take: 1 },
                },
            },
        },
    });

    if (!expedition) return { ...NOTHING, skipped: 'expedition-not-found' };

    const client = expedition.client;
    const messaging = new MessagingService();
    const status = await messaging.getStatus();

    // Two switches, and both must be on: ULS has to have the channel set up
    // and auto-send enabled (below), and this particular client has to have
    // been opted in. The client switch is what keeps "activer l'envoi
    // automatique" from writing to every client on file at once.
    if (!client.notificationsEnabled) {
        return { ...NOTHING, skipped: 'client-opted-out' };
    }

    const eventKey = kind === 'created' ? 'created' : expedition.status;
    const category = expeditionTemplateCategory(eventKey);

    // Fall back through: primary contact, then the company record.
    const primaryContact = client.contacts[0] ?? null;
    const emailTo = primaryContact?.email || client.email;
    const whatsappTo = primaryContact?.phone || client.phone;

    const context = {
        client: client as Client,
        expedition: expedition as Expedition,
        customData: {
            statut_precedent: previousStatus ? expeditionStatusLabel(previousStatus) : '',
            transporteur: BRAND.name,
        },
    };

    const outcome: NotifyOutcome = { ...NOTHING };

    // ── E-mail ────────────────────────────────────────────────────────
    if (status.emailAutoSend && emailTo) {
        const template = await resolveTemplate('email', client.id, category);
        if (template) {
            const subject = TemplateRenderer.render(
                template.subject || `${BRAND.name} — ${expedition.reference}`,
                context
            );
            const text = TemplateRenderer.render(template.content, context);

            const result = await messaging.sendEmail(
                { to: emailTo, subject, text, html: TemplateRenderer.textToHtml(text) },
                { isAuto: true, templateId: template.id }
            );
            outcome.emailSent = result.success;
            if (result.success) await markTemplateUsed(template.id);
        }
    }

    // ── WhatsApp ──────────────────────────────────────────────────────
    if (status.whatsappAutoSend && whatsappTo) {
        const template = await resolveTemplate('whatsapp', client.id, category);
        if (template) {
            const text = TemplateRenderer.render(template.content, context);

            const result = await messaging.sendWhatsApp(
                { to: whatsappTo, text, isFullMessage: true },
                { isAuto: true, templateId: template.id }
            );
            outcome.whatsappSent = result.success;
            if (result.success) await markTemplateUsed(template.id);
        }
    }

    // ── Exploitation ──────────────────────────────────────────────────
    //
    // The staff line is not template-driven: it is an operational ping, and
    // it must read the same whatever a client's templates happen to say.
    if (status.staffNotifyEnabled) {
        const line = staffLine(expedition, client, kind, previousStatus);
        const result = status.staffNotifyMode === 'group' && status.staffNotifyGroupId
            ? await messaging.sendWhatsAppToGroup(status.staffNotifyGroupId, line)
            : status.staffNotifyPhone
                ? await messaging.sendWhatsApp(
                    { to: status.staffNotifyPhone, text: line, isFullMessage: true },
                    { isAuto: true }
                )
                : { success: false, error: 'No staff recipient configured' };

        outcome.staffNotified = result.success;
    }

    return outcome;
}

/**
 * The template that governs this event, most specific first:
 *
 *   1. this client's template for this exact event
 *   2. the global template for this exact event
 *   3. this client's default template
 *   4. the global default template
 *
 * Returning null means nothing is configured, and so nothing is sent —
 * silence is the right answer, not a message with no text.
 */
async function resolveTemplate(
    type: 'email' | 'whatsapp',
    clientId: string,
    category: string
): Promise<MessageTemplate | null> {
    const base = { type, status: 'active' as const };

    const forEvent = await prisma.messageTemplate.findFirst({
        where: { ...base, category, OR: [{ clientId }, { scope: 'global' }] },
        // A client's own template outranks the global one.
        orderBy: [{ clientId: 'desc' }, { updatedAt: 'desc' }],
    });
    if (forEvent) return forEvent;

    const fallback = await prisma.messageTemplate.findFirst({
        where: { ...base, isDefault: true, OR: [{ clientId }, { scope: 'global' }] },
        orderBy: [{ clientId: 'desc' }, { updatedAt: 'desc' }],
    });

    return fallback;
}

async function markTemplateUsed(templateId: string): Promise<void> {
    try {
        await prisma.messageTemplate.update({
            where: { id: templateId },
            data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
        });
    } catch (error) {
        console.error('[ExpeditionNotifications] Failed to record template usage:', error);
    }
}

/** One-line operational summary for the exploitation WhatsApp. */
function staffLine(
    expedition: Expedition,
    client: Client,
    kind: ExpeditionEventKind,
    previousStatus?: string | null
): string {
    const route = [expedition.pickupCity, expedition.deliveryCity].filter(Boolean).join(' → ');
    const headline = kind === 'created'
        ? `*Nouvelle expédition* ${expedition.reference}`
        : previousStatus
            ? `*${expedition.reference}* : ${expeditionStatusLabel(previousStatus)} → ${expeditionStatusLabel(expedition.status)}`
            : `*${expedition.reference}* : ${expeditionStatusLabel(expedition.status)}`;

    return [
        headline,
        `Client : ${client.companyName}`,
        route ? `Trajet : ${route}` : null,
    ].filter(Boolean).join('\n');
}
