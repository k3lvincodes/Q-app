-- Fix: Add missing boots_count column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boots_count INTEGER DEFAULT 0;
