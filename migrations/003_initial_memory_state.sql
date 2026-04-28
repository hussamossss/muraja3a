-- Adds initial_memory_state to pages for the "محفوظة سابقًا" feature.
-- Values: 'new' | 'strong_old' | 'good_old' | 'hesitant_old' | 'weak_old'

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS initial_memory_state TEXT DEFAULT 'new';
