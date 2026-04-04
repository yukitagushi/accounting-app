-- Migration: Add vehicle columns to customers table
-- Run this in Supabase SQL Editor

alter table public.customers
  add column if not exists vehicle_model text,
  add column if not exists vehicle_year text,
  add column if not exists vehicle_number text,
  add column if not exists vehicle_inspection_date text;
