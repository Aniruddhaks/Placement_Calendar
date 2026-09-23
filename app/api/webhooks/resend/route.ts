import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

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
    
    // Verify webhook using Resend SDK
    const resend = new Resend('');
    const result = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    });

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
