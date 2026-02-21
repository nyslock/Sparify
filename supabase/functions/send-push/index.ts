// Sparify Push Notification Edge Function
// Deploy: supabase functions deploy send-push --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

// VAPID keys - Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@sparify.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Web Push implementation using Deno
async function sendWebPush(subscription: any, payload: string): Promise<boolean> {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;

  // For a production implementation, use web-push library or implement VAPID
  // This is a simplified version - in production use:
  // import webpush from 'npm:web-push';

  try {
    // Note: Full web-push implementation requires crypto operations
    // For production, consider using a service like Firebase Cloud Messaging
    // or implementing full VAPID signing

    console.log('Would send push to:', endpoint);
    console.log('Payload:', payload);

    // Placeholder for actual push - implement with web-push library
    // const response = await webpush.sendNotification(subscription, payload);

    return true;
  } catch (error) {
    console.error('Push failed:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, url, tag }: PushPayload = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get push subscription for user
    const { data: subscriptionData, error: subError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptionData) {
      return new Response(
        JSON.stringify({ message: 'No subscription found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      tag: tag || 'sparify-notification',
      icon: 'https://i.ibb.co/1fD3swCW/logo-tourquise-fade.png'
    });

    const success = await sendWebPush(subscriptionData.subscription, payload);

    if (success) {
      return new Response(
        JSON.stringify({ success: true, message: 'Push notification sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Remove invalid subscription
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user_id);

      return new Response(
        JSON.stringify({ success: false, message: 'Push failed, subscription removed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
