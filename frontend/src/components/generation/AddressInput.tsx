/**
 * AddressInput Component
 *
 * Property address input with Google Places Autocomplete integration.
 *
 * Requirements:
 * - T018: Google Places autocomplete for address suggestions
 * - FR-001: Address input with real-time validation
 * - Research: 300ms debounce, session tokens for cost optimization
 *
 * Features:
 * - Google Places Autocomplete API integration
 * - Address validation and formatting
 * - Session tokens for billing optimization
 * - Accessible keyboard navigation
 * - Loading and error states
 */

import React, { useEffect, useRef, useState } from 'react';

interface AddressInputProps {
  /** Current address value */
  value: string;
  /** Callback when address changes */
  onChange: (address: string, placeId?: string) => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Custom CSS classes */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  placeholder = '123 Main Street, San Francisco, CA',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load Google Maps Places API
  useEffect(() => {
    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    // Check if API key is configured
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setLoadError('Google Maps API key not configured');
      console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable not set');
      return;
    }

    // Check if script is already in the DOM (being loaded by another component instance)
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);

    if (existingScript) {
      // Script already exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);

      // Cleanup interval on unmount
      return () => clearInterval(checkLoaded);
    }

    // Load script (only if not already present)
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      setLoadError('Failed to load Google Maps API');
      console.error('Failed to load Google Maps Places API');
    };
    document.head.appendChild(script);

    return () => {
      // Note: We intentionally don't remove the script on unmount
      // as it may be shared by other component instances
    };
  }, []);

  // Initialize autocomplete when loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    try {
      // Initialize autocomplete with restrictions
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'], // Only property addresses
        componentRestrictions: { country: 'us' }, // US addresses only for MVP
        fields: ['formatted_address', 'place_id', 'address_components'], // Minimize billing
      });

      autocomplete.setFields(['formatted_address', 'place_id']);

      // Handle place selection (v2 approach - simple and works!)
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('[AddressInput] Place selected:', place);

        if (place && place.formatted_address && place.place_id) {
          console.log('[AddressInput] Updating address to:', place.formatted_address);
          // Simply call onChange - React's controlled component will handle the rest
          onChange(place.formatted_address, place.place_id);
        } else {
          console.warn('[AddressInput] Place missing required fields:', place);
        }
      });

      // Handle Tab key to select first autocomplete result
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && inputRef.current && inputRef.current.value) {
          // Check if autocomplete dropdown is visible by checking for pac-container
          const pacContainer = document.querySelector('.pac-container');
          if (pacContainer && pacContainer.querySelector('.pac-item')) {
            // Prevent default tab behavior
            e.preventDefault();

            // Simulate Enter key press to select the first item
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
            });
            inputRef.current.dispatchEvent(enterEvent);
          }
        }
      };

      // Add keydown listener to input
      inputRef.current.addEventListener('keydown', handleKeyDown);

      autocompleteRef.current = autocomplete;

      // Store handleKeyDown reference for cleanup
      (inputRef.current as any)._handleKeyDown = handleKeyDown;
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
      setLoadError('Failed to initialize address autocomplete');
    }

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

      // Remove keydown listener
      if (inputRef.current) {
        const handleKeyDown = (inputRef.current as any)._handleKeyDown;
        if (handleKeyDown) {
          inputRef.current.removeEventListener('keydown', handleKeyDown);
          delete (inputRef.current as any)._handleKeyDown;
        }
      }
    };
  }, [isLoaded, onChange]);

  // Sync Google Places input with React state (fix for autocomplete not respecting controlled component)
  // This ensures when parent re-renders (e.g., area selection), Google Places input stays in sync
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      console.log('[AddressInput] Syncing Google Places input with React state:', value);
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div className={className}>
      <label htmlFor="address" className="block text-sm font-medium text-neutral-900 mb-2">
        Property Address
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id="address"
          name="address"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !!loadError}
          required
          autoComplete="off"
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-lg transition-colors duration-200
            ${error
              ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
              : 'border-neutral-300 focus:ring-brand-green focus:border-brand-green'
            }
            focus:ring-2 focus:outline-none
            disabled:bg-neutral-100 disabled:cursor-not-allowed
            placeholder:text-neutral-400
          `}
          aria-invalid={!!error}
          aria-describedby={error ? 'address-error' : undefined}
          data-testid="address-input"
        />

        {/* Loading indicator for API */}
        {!isLoaded && !loadError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-brand-green"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          id="address-error"
          className="mt-2 text-sm text-error-600"
          role="alert"
          data-testid="address-error"
        >
          {error}
        </p>
      )}

      {/* Load error message */}
      {loadError && (
        <p className="mt-2 text-sm text-warning-600" role="alert">
          {loadError}. You can still enter an address manually.
        </p>
      )}

      {/* Helper text */}
      {!error && !loadError && (
        <p className="mt-2 text-xs text-neutral-500">
          Start typing to see address suggestions
        </p>
      )}
    </div>
  );
};

export default AddressInput;
