/**
 * Pricing Page
 *
 * Beautiful pricing page with 2-column comparison of Pay-As-You-Go vs Monthly Pro.
 * Updated with yarda.pro design system.
 *
 * Requirements:
 * - T096: Pricing page with professional design
 * - Display token packages (Pay-As-You-Go)
 * - Display Monthly Pro subscription
 * - Feature comparison
 * - FAQ section
 * - Mobile responsive
 * - Clear call-to-action buttons
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/userStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { tokenAPI, getErrorMessage } from '@/lib/api';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface TokenPackage {
  package_id: string;
  tokens: number;
  price_usd: string;
  price_cents: number;
  price_per_token: string;
  discount_percent: number | null;
  is_best_value: boolean;
}

interface FAQ {
  question: string;
  answer: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();
  const { subscribe } = useSubscriptionStore();
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Fetch token packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const packages = await tokenAPI.getPackages();
        setTokenPackages(packages);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push('/register?redirect=/pricing');
      return;
    }

    setSubscribing(true);
    try {
      await subscribe('monthly_pro');
    } catch (err) {
      setError(getErrorMessage(err));
      setSubscribing(false);
    }
  };

  const handleBuyTokens = () => {
    if (!isAuthenticated) {
      router.push('/register?redirect=/purchase');
      return;
    }
    router.push('/purchase');
  };

  const faqs: FAQ[] = [
    {
      question: 'What happens when I run out of tokens?',
      answer:
        'You can purchase more tokens at any time. Tokens never expire, so you can use them at your own pace. If you find yourself running out frequently, consider upgrading to Monthly Pro for unlimited generations.',
    },
    {
      question: 'Can I switch between pay-as-you-go and subscription?',
      answer:
        'Yes! You can subscribe to Monthly Pro at any time. Your existing tokens will remain available to use even after subscribing. If you cancel your subscription, you can continue using your tokens.',
    },
    {
      question: 'What if a generation fails?',
      answer:
        'If a generation fails for any reason, your token (or subscription credit) is automatically refunded. You will never be charged for failed generations.',
    },
    {
      question: 'Can I cancel my Monthly Pro subscription?',
      answer:
        'Yes, you can cancel anytime. You will retain access to unlimited generations until the end of your current billing period. No long-term commitment required.',
    },
    {
      question: 'Do tokens expire?',
      answer:
        'No! Tokens never expire. Purchase them when you want and use them whenever you need them, even years later.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure payment processor, Stripe.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="hero-gradient text-white py-20 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-brand-cream max-w-3xl mx-auto">
            Choose the plan that fits your needs. Start with pay-as-you-go or unlock
            unlimited designs with Monthly Pro.
          </p>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-16 bg-brand-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pay-As-You-Go Column */}
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-neutral-900 mb-2">Pay-As-You-Go</h2>
                <p className="text-neutral-600">
                  Purchase tokens and use them at your own pace
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-brand-sage border-t-brand-green rounded-full animate-spin"></div>
                  <p className="mt-4 text-neutral-600">Loading packages...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tokenPackages.map((pkg) => (
                    <div
                      key={pkg.package_id}
                      className="bg-white rounded-xl border-2 border-brand-sage p-6 hover:border-brand-green hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-neutral-900">
                            {pkg.tokens} tokens
                          </h3>
                          <p className="text-sm text-neutral-600 mt-1">
                            ${parseFloat(pkg.price_per_token).toFixed(2)} per generation
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-extrabold text-brand-green">
                            ${parseFloat(pkg.price_usd).toFixed(2)}
                          </div>
                          {pkg.discount_percent && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-success-100 text-success-700 text-xs font-semibold rounded">
                              Save {pkg.discount_percent}%
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="space-y-2 mb-4">
                        <li className="flex items-start gap-2 text-sm text-neutral-700">
                          <svg
                            className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>{pkg.tokens} AI-powered landscape designs</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-neutral-700">
                          <svg
                            className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>Tokens never expire</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-neutral-700">
                          <svg
                            className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>All design styles included</span>
                        </li>
                      </ul>
                    </div>
                  ))}

                  <button
                    onClick={handleBuyTokens}
                    className="w-full py-3 px-6 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg transition-colors duration-200 font-semibold"
                  >
                    Buy Tokens
                  </button>
                </div>
              )}
            </div>

            {/* Monthly Pro Column */}
            <div>
              <div className="relative hero-gradient rounded-2xl shadow-2xl p-8 text-white">
                {/* Popular Badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-block px-4 py-1 bg-brand-sage text-brand-dark-green text-sm font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>

                <div className="text-center mb-8 mt-4">
                  <h2 className="text-3xl font-bold mb-2">Monthly Pro</h2>
                  <p className="text-brand-cream">Unlimited designs for power users</p>
                </div>

                <div className="text-center mb-8">
                  <div className="text-6xl font-extrabold mb-2">$99</div>
                  <div className="text-xl text-brand-cream">per month</div>
                  <div className="text-sm text-brand-cream mt-2">
                    Cancel anytime, no commitment
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-brand-cream flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <div className="font-semibold text-lg">Unlimited Generations</div>
                      <div className="text-brand-cream text-sm">
                        Create as many designs as you need
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-brand-cream flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <div className="font-semibold text-lg">Priority Processing</div>
                      <div className="text-brand-cream text-sm">
                        Faster generation times for your projects
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-brand-cream flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <div className="font-semibold text-lg">All Design Styles</div>
                      <div className="text-brand-cream text-sm">
                        Access to current and future styles
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-brand-cream flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <div className="font-semibold text-lg">Premium Support</div>
                      <div className="text-brand-cream text-sm">
                        Priority customer support via email
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-brand-cream flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <div className="font-semibold text-lg">Cancel Anytime</div>
                      <div className="text-brand-cream text-sm">
                        No long-term commitment required
                      </div>
                    </div>
                  </li>
                </ul>

                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full py-4 px-6 bg-white text-brand-green hover:bg-brand-cream rounded-lg transition-colors duration-200 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {subscribing ? (
                    <>
                      <div className="w-5 h-5 border-3 border-brand-green border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </button>

                <p className="text-center text-brand-cream text-sm mt-4">
                  14-day money-back guarantee
                </p>
              </div>

              {/* Value Proposition */}
              <div className="mt-6 bg-brand-sage border-2 border-brand-sage rounded-lg p-6">
                <h3 className="font-bold text-brand-dark-green mb-2 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  Best Value for Professionals
                </h3>
                <p className="text-neutral-700 text-sm">
                  If you generate more than 100 designs per month, Monthly Pro saves you money
                  compared to pay-as-you-go. Perfect for landscape designers, real estate
                  professionals, and property managers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-neutral-900 mb-12">
            Compare Plans
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-brand-sage">
                  <th className="text-left py-4 px-4 font-semibold text-neutral-900">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-neutral-900">
                    Pay-As-You-Go
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-brand-green">
                    Monthly Pro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-sage">
                <tr>
                  <td className="py-4 px-4 text-neutral-700">Number of Generations</td>
                  <td className="py-4 px-4 text-center text-neutral-700">Based on tokens</td>
                  <td className="py-4 px-4 text-center font-semibold text-brand-green">
                    Unlimited
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-neutral-700">Cost per Generation</td>
                  <td className="py-4 px-4 text-center text-neutral-700">$0.70 - $0.98</td>
                  <td className="py-4 px-4 text-center font-semibold text-brand-green">
                    $0 (included)
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-neutral-700">Processing Priority</td>
                  <td className="py-4 px-4 text-center text-neutral-700">Standard</td>
                  <td className="py-4 px-4 text-center font-semibold text-brand-green">
                    Priority
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-neutral-700">All Design Styles</td>
                  <td className="py-4 px-4 text-center">
                    <svg
                      className="w-5 h-5 text-brand-green mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg
                      className="w-5 h-5 text-brand-green mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-neutral-700">Token Expiration</td>
                  <td className="py-4 px-4 text-center text-neutral-700">Never</td>
                  <td className="py-4 px-4 text-center text-neutral-700">N/A</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-neutral-700">Customer Support</td>
                  <td className="py-4 px-4 text-center text-neutral-700">Standard</td>
                  <td className="py-4 px-4 text-center font-semibold text-brand-green">
                    Priority
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-brand-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-neutral-900 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-brand-sage overflow-hidden"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-brand-sage transition-colors duration-200"
                >
                  <span className="font-semibold text-neutral-900">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-brand-green transition-transform duration-200 ${
                      openFAQ === index ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFAQ === index && (
                  <div className="px-6 pb-4 text-neutral-700">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-brand-cream mb-8">
            Join thousands of professionals creating stunning landscape designs with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="px-8 py-4 bg-white text-brand-green hover:bg-brand-cream rounded-lg transition-colors duration-200 font-bold text-lg shadow-lg disabled:opacity-50"
            >
              Start with Monthly Pro
            </button>
            <button
              onClick={handleBuyTokens}
              className="px-8 py-4 bg-brand-dark-green hover:bg-neutral-800 text-white rounded-lg transition-colors duration-200 font-bold text-lg"
            >
              Buy Tokens Instead
            </button>
          </div>
          <p className="text-brand-cream text-sm mt-6">
            No credit card required to start your free trial
          </p>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md bg-error-600 text-white px-6 py-4 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
