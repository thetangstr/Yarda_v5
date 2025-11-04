# Google Cloud Platform Setup Instructions

**Feature**: 003-google-maps-integration
**Date**: 2025-11-04

## Manual Setup Tasks (T001-T002)

### T001: Create Google Cloud Platform Project and Enable APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the following APIs:
   - Go to **APIs & Services** > **Library**
   - Search and enable:
     - **Geocoding API**
     - **Street View Static API**
     - **Maps Static API**

### T002: Generate Google Maps API Key and Configure Restrictions

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API key**
3. Copy the generated API key
4. Click **Edit API key** and configure restrictions:

**Application Restrictions**:
- Select **IP addresses**
- Add your production server IP addresses
- For development: Add your local machine IP

**API Restrictions**:
- Select **Restrict key**
- Select only:
  - Geocoding API
  - Street View Static API
  - Maps Static API

5. Save the API key securely

### T005: Configure Google Cloud Billing Alerts

1. Go to **Billing** > **Budgets & alerts**
2. Create a new budget:
   - Name: "Google Maps API Usage"
   - Amount: Set based on expected usage (e.g., $50/month)
3. Configure alert thresholds:
   - 50% of budget
   - 90% of budget
   - 100% of budget
4. Set email notifications to your team

---

## Next Steps

After completing the manual setup above:

1. Copy your API key
2. Add it to `backend/.env.local` as `GOOGLE_MAPS_API_KEY=your_key_here`
3. Continue with automated implementation tasks (T003-T062)

## Automated Tasks Progress

Tasks T003-T062 will be executed automatically by the implementation script.
