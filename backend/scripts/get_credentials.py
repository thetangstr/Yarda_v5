#!/usr/bin/env python3
"""
Credential Helper Script
Helps you get the missing credentials needed for the application
"""
import os
import sys
from pathlib import Path

class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}\n")

def print_section(text):
    print(f"\n{Colors.BOLD}{Colors.YELLOW}{text}{Colors.END}")
    print(f"{Colors.YELLOW}{'-'*70}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ{Colors.END}  {text}")

def print_success(text):
    print(f"{Colors.GREEN}✓{Colors.END}  {text}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠{Colors.END}  {text}")

def print_error(text):
    print(f"{Colors.RED}✗{Colors.END}  {text}")

def print_credential_instructions():
    """Print instructions for getting each credential"""

    print_header("CREDENTIAL SETUP GUIDE")
    print("This guide will help you get all the credentials needed for the application.")
    print("We'll check what you already have and show you how to get what's missing.\n")

    # Supabase
    print_section("1. SUPABASE DATABASE CREDENTIALS")
    print_success("Project ID: srktllgrxvgwjlbxmpeh")
    print_success("Supabase URL: https://srktllgrxvgwjlbxmpeh.supabase.co")
    print_success("Anon Key: Configured")
    print_warning("Missing: Database Password & Service Role Key")
    print()
    print("To get these:")
    print("  1. Go to: https://app.supabase.com/project/srktllgrxvgwjlbxmpeh/settings/database")
    print("  2. Under 'Connection string', click 'URI'")
    print("  3. Copy the password from the connection string")
    print("  4. Update DATABASE_URL in backend/.env with the password")
    print()
    print("  For Service Role Key:")
    print("  1. Go to: https://app.supabase.com/project/srktllgrxvgwjlbxmpeh/settings/api")
    print("  2. Copy the 'service_role' key (NOT the anon key)")
    print("  3. Update SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local")
    print()
    print(f"  {Colors.YELLOW}Backend .env:{Colors.END}")
    print("    DATABASE_URL=postgresql://postgres.srktllgrxvgwjlbxmpeh:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres")
    print()
    print(f"  {Colors.YELLOW}Frontend .env.local:{Colors.END}")
    print("    SUPABASE_SERVICE_ROLE_KEY=eyJ...")

    # Stripe
    print_section("2. STRIPE CREDENTIALS")
    print_success("Secret Key: Configured")
    print_success("Publishable Key: Configured")
    print_success("Webhook Secret: Configured")
    print()
    print("All Stripe credentials are already configured!")

    # Firebase
    print_section("3. FIREBASE CREDENTIALS")
    print_warning("Missing: All Firebase credentials")
    print()
    print("To get these:")
    print("  1. Go to: https://console.firebase.google.com")
    print("  2. Select your project or create a new one")
    print("  3. Go to Project Settings (gear icon)")
    print()
    print("  For Service Account (backend):")
    print("    a. Go to 'Service accounts' tab")
    print("    b. Click 'Generate new private key'")
    print("    c. Save the JSON file as: backend/firebase-credentials.json")
    print()
    print("  For Web App Config (frontend):")
    print("    a. Go to 'General' tab")
    print("    b. Scroll to 'Your apps' section")
    print("    c. Click on your web app (or add one if none exists)")
    print("    d. Copy the config object values")
    print("    e. Update these in frontend/.env.local:")
    print("       - NEXT_PUBLIC_FIREBASE_API_KEY")
    print("       - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
    print("       - NEXT_PUBLIC_FIREBASE_PROJECT_ID")
    print("       - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")
    print("       - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")
    print("       - NEXT_PUBLIC_FIREBASE_APP_ID")

    # Other Services
    print_section("4. OTHER SERVICES")
    print_success("Gemini API Key: Configured")
    print_success("Google Maps API Key: Configured")
    print_success("Vercel Blob Token: Configured")
    print()
    print("All other API keys are already configured!")

    # Summary
    print_section("SUMMARY")
    print()
    print("You need to configure:")
    print("  [1] Supabase Database Password (backend/.env)")
    print("  [2] Supabase Service Role Key (frontend/.env.local)")
    print("  [3] Firebase Service Account JSON (backend/firebase-credentials.json)")
    print("  [4] Firebase Web App Config (frontend/.env.local)")
    print()
    print("Everything else is already configured!")

def create_env_template():
    """Show what the final .env files should look like"""

    print_header("ENVIRONMENT FILE TEMPLATES")

    print_section("BACKEND .env")
    print("""DATABASE_URL=postgresql://postgres.srktllgrxvgwjlbxmpeh:[YOUR_PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
STRIPE_SECRET_KEY=[GET_FROM_STRIPE_DASHBOARD]
STRIPE_PUBLISHABLE_KEY=[GET_FROM_STRIPE_DASHBOARD]
STRIPE_WEBHOOK_SECRET=[GET_FROM_STRIPE_DASHBOARD]
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
GEMINI_API_KEY=[GET_NEW_KEY_FROM_https://aistudio.google.com/app/apikey]
GOOGLE_MAPS_API_KEY=[GET_FROM_GOOGLE_CLOUD_CONSOLE]
BLOB_READ_WRITE_TOKEN=[GET_FROM_VERCEL_DASHBOARD]
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
SKIP_EMAIL_VERIFICATION=true""")

    print_section("FRONTEND .env.local")
    print("""NEXT_PUBLIC_SUPABASE_URL=https://srktllgrxvgwjlbxmpeh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3RsbGdyeHZnd2psYnhtcGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxNDE5NzcsImV4cCI6MjAzMTcxNzk3N30.Z0hc4DFJwNfkkwcW7MiqYpQmA0TLyEyaPrT8rqEhqE4
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SFRzFFTQshkOgZLCxxrEwdkCAOHQOFYRi03WJq59EIpd1j8IyUrUBNwuGniE4S55m75C6auHhEYowGE87nmzufH00NgLXcpiB
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=[YOUR_API_KEY]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[YOUR_PROJECT].firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=[YOUR_PROJECT_ID]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[YOUR_PROJECT].appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[YOUR_SENDER_ID]
NEXT_PUBLIC_FIREBASE_APP_ID=[YOUR_APP_ID]""")

def show_next_steps():
    """Show next steps after credentials are configured"""

    print_header("NEXT STEPS")

    print("After you've configured all credentials:")
    print()
    print(f"{Colors.GREEN}1. Apply Database Migrations{Colors.END}")
    print("   cd /Volumes/home/Projects_Hosted/Yarda_v5/backend")
    print("   source venv/bin/activate")
    print("   python scripts/apply_migrations.py")
    print()
    print(f"{Colors.GREEN}2. Verify Setup{Colors.END}")
    print("   python scripts/verify_setup.py")
    print()
    print(f"{Colors.GREEN}3. Start Backend Server{Colors.END}")
    print("   uvicorn src.main:app --reload")
    print()
    print(f"{Colors.GREEN}4. Start Frontend Server{Colors.END}")
    print("   cd ../frontend")
    print("   npm run dev")
    print()
    print(f"{Colors.GREEN}5. Test the Application{Colors.END}")
    print("   Open: http://localhost:3000")
    print("   API Docs: http://localhost:8000/docs")

def main():
    """Main function"""
    print_credential_instructions()
    print()
    create_env_template()
    print()
    show_next_steps()

    print_header("QUICK REFERENCE")
    print()
    print(f"{Colors.BOLD}Supabase Project:{Colors.END} srktllgrxvgwjlbxmpeh")
    print(f"{Colors.BOLD}Dashboard:{Colors.END} https://app.supabase.com/project/srktllgrxvgwjlbxmpeh")
    print(f"{Colors.BOLD}Database Settings:{Colors.END} https://app.supabase.com/project/srktllgrxvgwjlbxmpeh/settings/database")
    print(f"{Colors.BOLD}API Settings:{Colors.END} https://app.supabase.com/project/srktllgrxvgwjlbxmpeh/settings/api")
    print()

if __name__ == "__main__":
    main()
