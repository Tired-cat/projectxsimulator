ALTER TABLE public.submissions
  ADD COLUMN generated_story text,
  ADD COLUMN descriptive_card_count integer NOT NULL DEFAULT 0,
  ADD COLUMN diagnostic_card_count integer NOT NULL DEFAULT 0,
  ADD COLUMN prescriptive_card_count integer NOT NULL DEFAULT 0,
  ADD COLUMN predictive_card_count integer NOT NULL DEFAULT 0,
  ADD COLUMN contextualise_pairs_count integer NOT NULL DEFAULT 0,
  ADD COLUMN final_tiktok_spend integer,
  ADD COLUMN final_instagram_spend integer,
  ADD COLUMN final_facebook_spend integer,
  ADD COLUMN final_newspaper_spend integer;