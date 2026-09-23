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
    
    // Verify webhook using Svix-compatible verification
    const payload = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('base64');

    // Parse svix-signature header (format: "v1,signature1,v2,signature2,...")
    const signatureEntries = svixSignature.split(',');
    let signatureMatch = false;
    
    for (let i = 0; i < signatureEntries.length; i += 2) {
      const version = signatureEntries[i];
      const signature = signatureEntries[i + 1];
      
      if (version === 'v1' && signature) {
        // Use timing-safe comparison
        const expectedBuffer = Buffer.from(expectedSignature);
        const receivedBuffer = Buffer.from(signature);
        
        if (expectedBuffer.length === receivedBuffer.length) {
          let match = true;
          for (let j = 0; j < expectedBuffer.length; j++) {
            if (expectedBuffer[j] !== receivedBuffer[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            signatureMatch = true;
            break;
          }
        }
      }
    }

    if (!signatureMatch) {
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
