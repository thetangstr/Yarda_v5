-- Rename token account columns to match API expectations
-- From lifetime_purchased/lifetime_consumed to total_purchased/total_consumed

ALTER TABLE token_accounts
  RENAME COLUMN lifetime_purchased TO total_purchased;

ALTER TABLE token_accounts
  RENAME COLUMN lifetime_consumed TO total_consumed;

-- Update comment to reflect new column names
COMMENT ON TABLE token_accounts IS 'Manages paid token balances for users. total_purchased tracks cumulative purchases, total_consumed tracks cumulative usage.';
