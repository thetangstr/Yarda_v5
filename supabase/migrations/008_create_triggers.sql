-- Migration 008: Create database triggers
-- Purpose: Auto-update timestamps and validate balances
-- Requirements: Automatic timestamp updates, balance validation

-- Trigger Function 1: update_updated_at_column
-- Purpose: Automatically update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Automatically update updated_at timestamp';

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_accounts_updated_at
    BEFORE UPDATE ON users_token_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generation_areas_updated_at
    BEFORE UPDATE ON generation_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at
    BEFORE UPDATE ON rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger Function 2: validate_token_balance
-- Purpose: Ensure token balance never goes negative (additional safety check)
CREATE OR REPLACE FUNCTION validate_token_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Token balance cannot be negative: %', NEW.balance;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_token_balance IS 'Prevent negative token balances (failsafe)';

-- Apply balance validation trigger
CREATE TRIGGER check_token_balance
    BEFORE INSERT OR UPDATE ON users_token_accounts
    FOR EACH ROW
    EXECUTE FUNCTION validate_token_balance();

-- Trigger Function 3: validate_trial_remaining
-- Purpose: Ensure trial_remaining never goes negative
CREATE OR REPLACE FUNCTION validate_trial_remaining()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.trial_remaining < 0 THEN
        RAISE EXCEPTION 'Trial remaining cannot be negative: %', NEW.trial_remaining;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_trial_remaining IS 'Prevent negative trial credits (failsafe)';

-- Apply trial validation trigger
CREATE TRIGGER check_trial_remaining
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_trial_remaining();
