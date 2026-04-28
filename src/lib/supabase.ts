import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// If the URL is just a project ID (no dots/slashes), format it correctly
if (supabaseUrl && !supabaseUrl.includes('.') && !supabaseUrl.includes('/')) {
  supabaseUrl = `https://${supabaseUrl}.supabase.co`;
}

// Only initialize if keys are present to avoid immediate crash
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

if (!supabase) {
  console.warn('Supabase keys are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.');
}

export type Profile = {
  id: string;
  email: string;
  balance: number;
  is_admin: boolean;
  full_name?: string;
  phone?: string;
  address?: string;
  nif?: string;
  bank_details?: string;
  bi_photo_url?: string;
  avatar_url?: string;
  created_at: string;
};

export type Raffle = {
  id: string;
  nome: string;
  description: string;
  image_url: string;
  price: number;
  total_numbers: number;
  current_number: number;
  sold_count: number;
  main_prize_value: number;
  main_prize_type: 'cash' | 'physical';
  main_prize_description?: string;
  winner_id: string | null;
  draw_date: string;
  status: 'active' | 'completed' | 'cancelled';
  is_featured?: boolean;
  featured_at?: string;
};

export type Purchase = {
  id: string;
  raffle_id: string;
  user_id: string;
  assigned_number: number;
  prize_won_amount: number;
  created_at: string;
};

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  method: 'iban' | 'express' | 'unitel';
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
