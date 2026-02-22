import { useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { PiggyBank } from '../types';

export interface RealtimeUpdateOptions {
  userId: string;
  onBalanceUpdate?: (piggyBanks: PiggyBank[], notification: { title: string; message: string; pigName: string; amount: number }) => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook to manage real-time balance updates via Supabase subscriptions
 * Automatically subscribes to changes in transactions and piggy_banks tables
 */
export const useRealtimeBalance = (options: RealtimeUpdateOptions) => {
  const { userId, onBalanceUpdate, onError } = options;
  const subscriptionsRef = useRef<any[]>([]);
  const lastUpdateRef = useRef<{ [key: string]: number }>({});

  const cleanup = useCallback(() => {
    // Remove all subscriptions
    subscriptionsRef.current.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe().catch(console.error);
      }
    });
    subscriptionsRef.current = [];
  }, []);

  const setupRealtimeSubscriptions = useCallback(() => {
    if (!userId) return;

    cleanup();

    try {
      // Subscribe to transaction changes for owned piggy banks
      const transactionSub = supabase
        .channel(`transactions-user-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'transactions',
            filter: `piggy_bank_id=in.(SELECT id FROM piggy_banks WHERE user_id=eq.${userId})`
          },
          async (payload) => {
            try {
              // Debounce rapid updates (within 500ms)
              const now = Date.now();
              const ponKey = payload.new?.piggy_bank_id || payload.old?.piggy_bank_id;
              if (lastUpdateRef.current[ponKey] && now - lastUpdateRef.current[ponKey] < 500) {
                return;
              }
              lastUpdateRef.current[ponKey] = now;

              // Fetch updated piggy bank data
              const { data: pigData } = await supabase
                .from('piggy_banks')
                .select('*, transactions(*)')
                .eq('id', ponKey)
                .single();

              if (pigData && onBalanceUpdate) {
                const { data: allPigs } = await supabase
                  .from('piggy_banks')
                  .select('*, transactions(*), goals(*)')
                  .eq('user_id', userId);

                if (allPigs) {
                  // Create notification
                  const transaction = payload.new;
                  const isDeposit = transaction?.type === 'deposit';
                  const amount = Math.abs(Number(transaction?.amount) || 0);
                  
                  const notification = {
                    title: isDeposit ? '💰 Einzahlung erhalten!' : '💸 Auszahlung getätigt!',
                    message: `${transaction?.title || (isDeposit ? 'Neue Einzahlung' : 'Auszahlung')}`,
                    pigName: pigData.name || 'Sparbox',
                    amount: amount
                  };

                  // Call parent callback with updated data
                  onBalanceUpdate(allPigs as any, notification);
                }
              }
            } catch (err) {
              console.error('Error handling realtime transaction update:', err);
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.push(transactionSub);

      // Subscribe to piggy bank balance changes (if balance is updated directly)
      const piggyBankSub = supabase
        .channel(`piggy-banks-user-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'piggy_banks',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            try {
              if (onBalanceUpdate) {
                // Fetch all updated piggy banks
                const { data: allPigs } = await supabase
                  .from('piggy_banks')
                  .select('*, transactions(*), goals(*)')
                  .eq('user_id', userId);

                if (allPigs) {
                  const notification = {
                    title: '✏️ Sparbox aktualisiert',
                    message: `${payload.new?.name} wurde aktualisiert`,
                    pigName: payload.new?.name || 'Sparbox',
                    amount: 0
                  };

                  onBalanceUpdate(allPigs as any, notification);
                }
              }
            } catch (err) {
              console.error('Error handling realtime piggy bank update:', err);
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.push(piggyBankSub);

      console.log('Real-time subscriptions established');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error setting up real-time subscriptions:', error);
      if (onError) onError(error);
    }
  }, [userId, onBalanceUpdate, onError, cleanup]);

  useEffect(() => {
    setupRealtimeSubscriptions();

    return cleanup;
  }, [setupRealtimeSubscriptions, cleanup]);

  return { cleanup };
};
