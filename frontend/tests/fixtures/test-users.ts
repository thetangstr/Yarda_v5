/**
 * Test User Fixtures for E2E Tests
 *
 * Pre-configured test users with different balance states
 * for comprehensive testing scenarios
 */

export interface TestUser {
  email: string;
  password: string;
  tokenBalance: number;
  trialRemaining: number;
  hasSubscription: boolean;
  description: string;
}

/**
 * Main test user with trial credits
 * Use this for most basic tests
 */
export const TEST_USER_WITH_TRIAL: TestUser = {
  email: 'thetangstr@gmail.com',
  password: 'Test@1234',
  tokenBalance: 0,
  trialRemaining: 3,
  hasSubscription: false,
  description: 'User with 3 trial credits remaining',
};

/**
 * Test user with tokens
 * Use for testing token-based generation flow
 */
export const TEST_USER_WITH_TOKENS: TestUser = {
  email: 'test.tokens@example.com',
  password: 'Test@1234',
  tokenBalance: 50,
  trialRemaining: 0,
  hasSubscription: false,
  description: 'User with 50 tokens, no trial',
};

/**
 * Test user with zero balance
 * Use for testing purchase flow and "no credits" state
 */
export const TEST_USER_ZERO_BALANCE: TestUser = {
  email: 'test.empty@example.com',
  password: 'Test@1234',
  tokenBalance: 0,
  trialRemaining: 0,
  hasSubscription: false,
  description: 'User with no credits (testing purchase flow)',
};

/**
 * Test user with one token
 * Use for testing token exhaustion scenarios
 */
export const TEST_USER_ONE_TOKEN: TestUser = {
  email: 'test.onetoken@example.com',
  password: 'Test@1234',
  tokenBalance: 1,
  trialRemaining: 0,
  hasSubscription: false,
  description: 'User with 1 token (testing exhaustion)',
};

/**
 * Test user with subscription
 * Use for testing unlimited generation with Pro plan
 */
export const TEST_USER_WITH_SUBSCRIPTION: TestUser = {
  email: 'test.pro@example.com',
  password: 'Test@1234',
  tokenBalance: 0,
  trialRemaining: 0,
  hasSubscription: true,
  description: 'User with active Pro subscription (unlimited)',
};

/**
 * Test user with high balance
 * Use for testing multi-area generations without balance concerns
 */
export const TEST_USER_HIGH_BALANCE: TestUser = {
  email: 'test.whale@example.com',
  password: 'Test@1234',
  tokenBalance: 500,
  trialRemaining: 0,
  hasSubscription: false,
  description: 'User with 500 tokens (no balance concerns)',
};

/**
 * Test user with mixed credits
 * Use for testing authorization priority (trial + tokens)
 */
export const TEST_USER_MIXED_CREDITS: TestUser = {
  email: 'test.mixed@example.com',
  password: 'Test@1234',
  tokenBalance: 50,
  trialRemaining: 2,
  hasSubscription: false,
  description: 'User with both trial and tokens (testing priority)',
};

/**
 * Get test user by scenario
 */
export function getTestUser(scenario: 'trial' | 'tokens' | 'empty' | 'subscription' | 'mixed'): TestUser {
  switch (scenario) {
    case 'trial':
      return TEST_USER_WITH_TRIAL;
    case 'tokens':
      return TEST_USER_WITH_TOKENS;
    case 'empty':
      return TEST_USER_ZERO_BALANCE;
    case 'subscription':
      return TEST_USER_WITH_SUBSCRIPTION;
    case 'mixed':
      return TEST_USER_MIXED_CREDITS;
    default:
      return TEST_USER_WITH_TRIAL;
  }
}

/**
 * Create timestamp-based unique email for isolated tests
 * Useful when you need a fresh user with no history
 */
export function createUniqueTestUser(
  baseEmail = 'test.e2e',
  domain = 'example.com'
): TestUser {
  const timestamp = Date.now();
  return {
    email: `${baseEmail}+${timestamp}@${domain}`,
    password: 'Test@1234',
    tokenBalance: 0,
    trialRemaining: 3,
    hasSubscription: false,
    description: `Unique test user created at ${timestamp}`,
  };
}
