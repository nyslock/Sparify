import { supabase } from './supabaseClient';
import { decryptAmount, encryptAmount } from './crypto';

// Function to get and decrypt balance from a single piggy bank
export async function getBalance(piggyBankId: string) {
  const { data, error } = await supabase
    .from('piggy_banks')
    .select('balance')
    .eq('id', piggyBankId)
    .single();

  if (error) {
    console.error('Error fetching balance:', error);
    return null;
  }

  const decryptedBalance = await decryptAmount(data.balance);
  return decryptedBalance;
}

// Function to get total balance from all user's piggy banks
export async function getTotalBalance(userId: string) {
  try {
    const { data, error } = await supabase
      .from('piggy_banks')
      .select('balance')
      .eq('user_id', userId);

    if (error) {
      // Ignore abort errors silently, log others
      if (!error.message?.includes('AbortError')) {
        console.error('Error fetching piggy banks:', error);
      }
      return 0;
    }

    let total = 0;
    for (const pig of data) {
      const decrypted = await decryptAmount(pig.balance);
      total += decrypted;
    }

    return total;
  } catch (err: any) {
    // Silently handle abort errors (common in React Strict Mode)
    if (err?.message?.includes('AbortError')) {
      return 0;
    }
    console.error('Error in getTotalBalance:', err);
    return 0;
  }
}

/**
 * Synchronizes the balance of a piggy bank by processing new transactions since the last update.
 * This implements the "Lazy Client-Side Balance Synchronization" architecture.
 * 
 * @param piggyBankId - The UUID of the piggy bank to sync
 * @returns The final numeric balance, or null if an error occurred
 */
export async function syncBalance(piggyBankId: string): Promise<number | null> {
  try {
    // Step 1: Fetch the piggy bank record
    const { data: piggyBank, error: bankError } = await supabase
      .from('piggy_banks')
      .select('balance, updated_at')
      .eq('id', piggyBankId)
      .single();

    if (bankError) {
      console.error('Error fetching piggy bank:', bankError);
      return null;
    }

    if (!piggyBank) {
      console.error('Piggy bank not found');
      return null;
    }

    // Step 2: Fetch new transactions since last update
    const { data: newTransactions, error: transError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('piggy_bank_id', piggyBankId)
      .gt('created_at', piggyBank.updated_at)
      .order('created_at', { ascending: true });

    if (transError) {
      console.error('Error fetching transactions:', transError);
      return null;
    }

    // Step 3: If no new transactions, return current decrypted balance
    if (!newTransactions || newTransactions.length === 0) {
      const currentBalance = await decryptAmount(piggyBank.balance);
      return currentBalance;
    }

    // Step 4: Calculate new balance
    let totalBalance = await decryptAmount(piggyBank.balance);

    for (const transaction of newTransactions) {
      // Transactions are stored unencrypted as numbers
      totalBalance += Number(transaction.amount) || 0;
    }

    // Step 5: Encrypt the new balance
    const encryptedBalance = await encryptAmount(totalBalance);

    // Step 6: Update the piggy bank with new balance and timestamp
    const { error: updateError } = await supabase
      .from('piggy_banks')
      .update({
        balance: encryptedBalance,
        updated_at: new Date().toISOString() // NOW() equivalent
      })
      .eq('id', piggyBankId);

    if (updateError) {
      console.error('Error updating piggy bank balance:', updateError);
      return null;
    }

    // Step 7: Return the final balance
    return totalBalance;

  } catch (error) {
    console.error('Unexpected error in syncBalance:', error);
    return null;
  }
}