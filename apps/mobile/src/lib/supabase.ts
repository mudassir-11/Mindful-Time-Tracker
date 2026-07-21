import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://hnajhcjethruisddfksi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYWpoY2pldGhydWlzZGRma3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTY2MDUsImV4cCI6MjA5Nzg5MjYwNX0.zG5VhzJ9YoieYjK3I7ov0c0de8mOykg6CL4iZ2H3HMs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
