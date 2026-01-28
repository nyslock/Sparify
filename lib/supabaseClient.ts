import { createClient } from '@supabase/supabase-js';

// SCHRITT 1: Lösche den Text in den Anführungszeichen und füge deine Supabase Daten ein.
// Du findest sie unter: Supabase Dashboard -> Project Settings -> API

const SUPABASE_URL = 'https://bejlqwebcujfklavoecm.supabase.co'; // z.B. https://xxyyzz.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlamxxd2ViY3VqZmtsYXZvZWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzQwMDgsImV4cCI6MjA4MTA1MDAwOH0.KFJjfAOar6PQxw72ukf_pKHNjfcvl6Bt4Gj683fTrCY'; // z.B. eyJhbGciOiJIUzI1NiIsInR5cCI...

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);