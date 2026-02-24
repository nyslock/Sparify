import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import admin from 'npm:firebase-admin'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const firebaseServiceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '';

const ensureFirebaseInitialized = () => {
  if (admin.apps.length) return;
  if (!firebaseServiceAccountRaw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing.');
  }

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(firebaseServiceAccountRaw);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
};

serve(async (req) => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
    }

    ensureFirebaseInitialized();

    const payload = await req.json();
    const newTransaction = payload.record; 
    
    if (!newTransaction || !newTransaction.piggy_bank_id) {
        return new Response("No valid transaction data", { status: 400 });
    }

    const { piggy_bank_id, amount, type } = newTransaction;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find piggy bank and its owner
    const { data: piggyBank, error: pbError } = await supabase
      .from('piggy_banks')
      .select('user_id, name')
      .eq('id', piggy_bank_id)
      .single();

    if (pbError || !piggyBank) {
        return new Response("Piggy bank not found", { status: 404 });
    }

    const targetUserId = piggyBank.user_id;
    const piggyBankName = piggyBank.name || 'Piggy Bank';

    // 2. Get user's FCM tokens
    const { data: tokensData, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', targetUserId);

    if (tokenError || !tokensData || tokensData.length === 0) {
        return new Response("User has no FCM tokens", { status: 200 });
    }

    const tokens = tokensData.map(t => t.token);

    // 3. Build notification message
    const actionText = type === 'deposit' ? 'increased by' : 'decreased by';
    const message = `Your piggy bank "${piggyBankName}" ${actionText} ${amount}!`;

    // 4. Send push notification
    const fcmMessage = {
      notification: {
        title: 'Piggy Bank Update 🐷',
        body: message,
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(fcmMessage);

    return new Response(JSON.stringify({ success: true, response }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
})