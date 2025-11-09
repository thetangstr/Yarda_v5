/**
 * Google Maps JavaScript API Type Definitions
 *
 * Minimal type definitions for Google Places Autocomplete and Google Identity Services
 */

declare namespace google {
  namespace maps {
    namespace places {
      class Autocomplete {
        constructor(
          input: HTMLInputElement,
          options?: {
            types?: string[];
            componentRestrictions?: { country: string | string[] };
            fields?: string[];
          }
        );

        setFields(fields: string[]): void;
        addListener(event: string, handler: () => void): void;
        getPlace(): {
          formatted_address?: string;
          place_id?: string;
          address_components?: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
        };
      }

      class AutocompleteSessionToken {}
    }

    namespace event {
      function clearInstanceListeners(instance: any): void;
    }
  }

  // Google Identity Services (One Tap, Sign-In)
  namespace accounts {
    namespace id {
      function initialize(config: any): void;
      function prompt(callback?: (notification: any) => void): void;
      function cancel(): void;
    }
  }
}

interface Window {
  google?: typeof google;
}
