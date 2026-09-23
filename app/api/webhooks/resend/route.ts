import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import {
  buildEventDedupKey,
  buildShortlistDedupKey,
  detectEmailType,
  parsePlacementEvent,
  parseShortlist,
} from '@/lib/email-parser';

type PostgrestInsertError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as PostgrestInsertError).code === '23505'
  );
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>\s*/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>\s*/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface ResendAttachmentInfo {
  id: string;
  filename: string | null;
  content_type: string;
}

async function fetchReceivedEmail(
  resend: Resend,
  emailId: string
): Promise<{
  subject: string;
  text: string | null;
  html: string | null;
  messageId: string | null;
  attachments: ResendAttachmentInfo[];
} | null> {
  try {
    const res = await resend.emails.receiving.get(emailId, {
      html_format: 'cid',
    });
    if (res.error) {
      console.error(
        '[Resend Webhook] Failed to fetch received email content from Resend:',
        res.error
      );
      return null;
    }
    const data = res.data;
    return {
      subject: data.subject ?? '',
      text: data.text ?? null,
      html: data.html ?? null,
      messageId: data.message_id ?? null,
      attachments: Array.isArray(data.attachments)
        ? data.attachments.map((a) => ({
            id: a.id,
            filename: a.filename,
            content_type: a.content_type,
          }))
        : [],
    };
  } catch (error) {
    console.error(
      '[Resend Webhook] Error fetching received email content:',
      error
    );
    return null;
  }
}

async function attachmentText(
  resend: Resend,
  emailId: string,
  attachment: ResendAttachmentInfo
): Promise<string | null> {
  try {
    const res = await resend.emails.receiving.attachments.get({
      emailId,
      id: attachment.id,
    });
    if (res.error || !res.data?.download_url) {
      console.error(
        `[Resend Webhook] Failed to fetch attachment ${attachment.filename ?? attachment.id}:`,
        res.error
      );
      return null;
    }

    const download = await fetch(res.data.download_url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!download.ok) {
      console.error(
        `[Resend Webhook] Attachment download failed for ${attachment.filename ?? attachment.id}: HTTP ${download.status}`
      );
      return null;
    }

    const content = await download.text();
    return content.length > 20_000 ? content.slice(0, 20_000) : content;
  } catch (error) {
    console.error(
      `[Resend Webhook] Error downloading attachment ${attachment.filename ?? attachment.id}:`,
      error
    );
    return null;
  }
}

const TEXT_ATTACHMENT_TYPES = new Set([
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
  'application/octet-stream',
]);

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const svixId = headersList.get('svix-id');
    const svixTimestamp = headersList.get('svix-timestamp');
    const svixSignature = headersList.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('[Resend Webhook] Missing svix headers');
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    }

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Resend Webhook] Missing RESEND_WEBHOOK_SECRET environment variable');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const rawBody = await request.text();

    const wh = new Webhook(webhookSecret);
    try {
      wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (error) {
      console.error('[Resend Webhook] Verification failed:', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let webhookData: {
      type?: string;
      data?: {
        email_id?: string;
        message_id?: string;
        from?: unknown;
        to?: unknown;
        subject?: string;
        text?: string;
        html?: string;
        created_at?: string;
        attachments?: ResendAttachmentInfo[];
      };
    };
    try {
      webhookData = JSON.parse(rawBody);
    } catch {
      console.error('[Resend Webhook] Failed to parse JSON payload');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[Resend Webhook] Webhook verified');

    const eventType: string = webhookData.type ?? 'unknown';
    console.log('[Resend Webhook] Event type:', eventType);

    const emailData = webhookData.data ?? {};
    const emailId: string | undefined = emailData.email_id;
    const payloadMessageId: string | null = emailData.message_id || null;
    const subject: string = emailData.subject || '';
    const receivedAt: string = emailData.created_at || new Date().toISOString();
    const announcementDate = receivedAt.slice(0, 10);

    console.log('[Resend Webhook] Received email:', {
      email_id: emailId,
      message_id: payloadMessageId,
      from: emailData.from,
      subject,
      received_at: receivedAt,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(
        '[Resend Webhook] Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'
      );
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sourceEmailId = emailId || payloadMessageId || 'unknown';

    // ── Fetch full email content from Resend ──
    let messageId = payloadMessageId;
    let bodyText = emailData.text || emailData.html || '';
    let attachments: ResendAttachmentInfo[] = Array.isArray(emailData.attachments)
      ? emailData.attachments.map((a: ResendAttachmentInfo) => ({
          id: a.id,
          filename: a.filename,
          content_type: a.content_type,
        }))
      : [];

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && emailId) {
      console.log('[Resend Webhook] Retrieving: fetching full email content from Resend API', {
        email_id: emailId,
        has_api_key: true,
      });
      const resend = new Resend(resendApiKey);
      const fetched = await fetchReceivedEmail(resend, emailId);
      if (fetched) {
        messageId = messageId || fetched.messageId;
        if (fetched.text) {
          bodyText = fetched.text;
        } else if (fetched.html) {
          bodyText = htmlToText(fetched.html);
        }
        if (attachments.length === 0 && fetched.attachments.length > 0) {
          attachments = fetched.attachments;
        }

        // Shortlist lists are often attached — try to read text-based attachments.
        for (const attachment of attachments) {
          const type = attachment.content_type?.toLowerCase() || '';
          if (TEXT_ATTACHMENT_TYPES.has(type)) {
            const text = await attachmentText(resend, emailId, attachment);
            if (text) {
              bodyText = `${bodyText}\n\n${text}`;
              console.log(
                '[Resend Webhook] Read attachment content:',
                attachment.filename ?? attachment.id
              );
            }
          }
        }
      }
    } else if (!resendApiKey) {
      console.warn(
        '[Resend Webhook] RESEND_API_KEY not configured; parsing subject-only content'
      );
    }

    console.log('[Resend Webhook] Email retrieved:', {
      message_id: messageId,
      body_length: bodyText.length,
      body_source: bodyText ? (bodyText === emailData.text ? 'webhook-payload' : 'resend-fetch') : 'none',
      attachment_count: attachments.length,
    });

    const emailType = detectEmailType(subject, bodyText);
    console.log('[Resend Webhook] Email classification:', emailType);

    const attachmentNames = attachments
      .filter((a) => a.filename)
      .map((a) => a.filename as string);

    if (emailType === 'UNKNOWN') {
      console.log('[Resend Webhook] Unsupported email type, ignoring');
      return NextResponse.json({ received: true, classification: 'UNKNOWN' }, { status: 200 });
    }

    if (emailType === 'EVENT') {
      const parsedEvent = parsePlacementEvent(subject, bodyText, sourceEmailId);
      if (!parsedEvent) {
        console.error(
          '[Resend Webhook] Parsing failed: could not extract company/event date; draft not created'
        );
        return NextResponse.json({ received: true, classification: 'EVENT', parsed: false }, { status: 200 });
      }

      console.log('[Resend Webhook] Parsed event:', {
        company: parsedEvent.company_name,
        role: parsedEvent.role,
        event_type: parsedEvent.event_type,
        event_date: parsedEvent.event_date,
        start_time: parsedEvent.start_time,
        end_time: parsedEvent.end_time,
      });

      const additionalDetails: Record<string, string> = {
        ...(parsedEvent.additional_details ?? {}),
      };
      if (messageId && messageId !== sourceEmailId) {
        additionalDetails.message_id = messageId;
      }
      if (attachmentNames.length > 0) {
        additionalDetails.source_attachments = attachmentNames.join(', ');
      }

      const dedupKey = buildEventDedupKey(parsedEvent);
      const record = {
        ...parsedEvent,
        additional_details:
          Object.keys(additionalDetails).length > 0 ? additionalDetails : null,
        dedup_key: dedupKey,
      };

      // Idempotency: the events.source_email_id and events.dedup_key unique
      // indexes enforce this atomically (see migration 004). Concurrent
      // deliveries that race here simply hit the unique-violation handler.
      console.log('[Resend Webhook] Inserting into Supabase (events)');
      const { error: insertError } = await supabase.from('events').insert(record);

      if (insertError) {
        if (isUniqueViolation(insertError)) {
          console.log('[Resend Webhook] Duplicate email ignored (race):', sourceEmailId);
          return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
        }
        console.error('[Resend Webhook] Supabase insert failed:', insertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      console.log('[Resend Webhook] Supabase insert successful (event draft)');
      return NextResponse.json({ received: true, classification: 'EVENT' }, { status: 200 });
    }

    if (emailType === 'SHORTLIST') {
      const parsedShortlist = parseShortlist(
        subject,
        bodyText,
        sourceEmailId,
        announcementDate
      );
      if (!parsedShortlist) {
        console.error(
          '[Resend Webhook] Parsing failed: could not extract company; draft not created'
        );
        return NextResponse.json({ received: true, classification: 'SHORTLIST', parsed: false }, { status: 200 });
      }

      console.log('[Resend Webhook] Parsed shortlist:', {
        company: parsedShortlist.company_name,
        role: parsedShortlist.role,
        student_count: parsedShortlist.student_count,
      });

      const dedupKey = buildShortlistDedupKey(parsedShortlist);
      const record = { ...parsedShortlist, dedup_key: dedupKey };

      // Associate with an existing matching event when one is known.
      const { data: matchingEvent } = await supabase
        .from('events')
        .select('id, role')
        .eq('company_name', parsedShortlist.company_name)
        .order('event_date', { ascending: false })
        .limit(10);

      let eventMatch: { id: string } | undefined;
      if (parsedShortlist.role) {
        const role = parsedShortlist.role.toLowerCase();
        eventMatch = (matchingEvent ?? []).find(
          (e: { role?: string | null }) =>
            String(e.role || '').toLowerCase().includes(role)
        );
      }
      if (!eventMatch && matchingEvent && matchingEvent.length > 0) {
        eventMatch = matchingEvent[0];
      }
      if (eventMatch) {
        record.event_id = eventMatch.id;
        console.log('[Resend Webhook] Associated shortlist with event:', eventMatch.id);
      }

      console.log('[Resend Webhook] Inserting into Supabase (shortlists)');
      const { error: insertError } = await supabase.from('shortlists').insert(record);

      if (insertError) {
        if (isUniqueViolation(insertError)) {
          console.log('[Resend Webhook] Duplicate email ignored (race):', sourceEmailId);
          return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
        }
        console.error('[Resend Webhook] Supabase insert failed:', insertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      console.log('[Resend Webhook] Supabase insert successful (shortlist draft)');
      return NextResponse.json({ received: true, classification: 'SHORTLIST' }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Resend Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}