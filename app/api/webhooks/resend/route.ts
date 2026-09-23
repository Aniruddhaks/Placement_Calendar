import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

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
    
    // Check timestamp to prevent replay attacks (5 minutes tolerance)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(svixTimestamp)) > 300) {
      console.error('[Resend Webhook] Signature timestamp too old');
      return NextResponse.json({ error: 'Signature expired' }, { status: 401 });
    }

    // Create expected signature using svix format
    const payload = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('base64');

    // Svix signatures are comma-separated
    const signatures = svixSignature.split(',').map(s => s.trim());
    if (!signatures.includes(expectedSignature)) {
      console.error('[Resend Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse and log the webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (e) {
      console.error('[Resend Webhook] Failed to parse JSON payload');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Log the received webhook for verification
    console.log('[Resend Webhook] Received email.received event:', {
      event_type: webhookData.type,
      event_id: webhookData.id,
      created_at: webhookData.created_at,
      data: {
        from: webhookData.data?.from,
        to: webhookData.data?.to,
        subject: webhookData.data?.subject,
        received_at: webhookData.data?.received_at,
      },
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Resend Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
