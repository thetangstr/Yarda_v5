#!/usr/bin/env python3
"""
Setup Verification Script
Checks that all components are properly configured
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓{Colors.END} {text}")

def print_error(text):
    print(f"{Colors.RED}✗{Colors.END} {text}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠{Colors.END} {text}")

def check_env_var(name, required=True, check_placeholder=True):
    """Check if environment variable is set and not a placeholder"""
    value = os.getenv(name)
    
    if not value:
        if required:
            print_error(f"{name}: Not set")
            return False
        else:
            print_warning(f"{name}: Not set (optional)")
            return True
    
    # Check for common placeholders
    placeholders = ['...', '[', 'YOUR', 'CHANGE', 'REPLACE', 'EXAMPLE']
    is_placeholder = check_placeholder and any(p in value for p in placeholders)
    
    if is_placeholder:
        print_warning(f"{name}: Set but appears to be placeholder")
        return False
    
    print_success(f"{name}: Configured")
    return True

def check_file_exists(path, description):
    """Check if a file exists"""
    if Path(path).exists():
        print_success(f"{description}: Found")
        return True
    else:
        print_error(f"{description}: Not found at {path}")
        return False

def check_backend_env():
    """Check backend environment configuration"""
    print_header("BACKEND ENVIRONMENT")
    
    checks = []
    
    # Database
    checks.append(check_env_var('DATABASE_URL'))
    
    # Stripe
    checks.append(check_env_var('STRIPE_SECRET_KEY'))
    checks.append(check_env_var('STRIPE_PUBLISHABLE_KEY'))
    checks.append(check_env_var('STRIPE_WEBHOOK_SECRET'))
    
    # Firebase
    firebase_path = os.getenv('FIREBASE_CREDENTIALS_PATH', './firebase-credentials.json')
    checks.append(check_env_var('FIREBASE_CREDENTIALS_PATH', required=False))
    backend_dir = Path(__file__).parent.parent
    checks.append(check_file_exists(backend_dir / 'firebase-credentials.json', 'Firebase credentials'))
    
    # AI
    checks.append(check_env_var('GEMINI_API_KEY'))
    
    # Storage
    checks.append(check_env_var('BLOB_READ_WRITE_TOKEN'))
    
    # URLs
    checks.append(check_env_var('APP_URL', check_placeholder=False))
    checks.append(check_env_var('API_URL', check_placeholder=False))
    checks.append(check_env_var('ENVIRONMENT', required=False, check_placeholder=False))
    
    return all(checks)

def check_frontend_env():
    """Check frontend environment configuration"""
    print_header("FRONTEND ENVIRONMENT")
    
    frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env.local'
    
    if not frontend_env.exists():
        print_error(f".env.local not found at {frontend_env}")
        return False
    
    # Load frontend env
    with open(frontend_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value
    
    checks = []
    
    # Supabase
    checks.append(check_env_var('NEXT_PUBLIC_SUPABASE_URL'))
    checks.append(check_env_var('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
    checks.append(check_env_var('SUPABASE_SERVICE_ROLE_KEY'))
    
    # Stripe
    checks.append(check_env_var('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'))
    
    # API
    checks.append(check_env_var('NEXT_PUBLIC_API_URL', check_placeholder=False))
    
    # Firebase
    checks.append(check_env_var('NEXT_PUBLIC_FIREBASE_API_KEY'))
    checks.append(check_env_var('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'))
    checks.append(check_env_var('NEXT_PUBLIC_FIREBASE_PROJECT_ID'))
    checks.append(check_env_var('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'))
    checks.append(check_env_var('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'))
    checks.append(check_env_var('NEXT_PUBLIC_FIREBASE_APP_ID'))
    
    return all(checks)

def check_dependencies():
    """Check that dependencies are installed"""
    print_header("DEPENDENCIES")
    
    checks = []
    
    # Backend virtual environment
    venv_python = Path(__file__).parent.parent / 'venv' / 'bin' / 'python'
    checks.append(check_file_exists(venv_python, 'Python virtual environment'))
    
    # Frontend node_modules
    node_modules = Path(__file__).parent.parent.parent / 'frontend' / 'node_modules'
    checks.append(check_file_exists(node_modules, 'Frontend node_modules'))
    
    # Check key Python packages
    try:
        import fastapi
        print_success(f"fastapi: {fastapi.__version__}")
        checks.append(True)
    except ImportError:
        print_error("fastapi: Not installed")
        checks.append(False)
    
    try:
        import asyncpg
        print_success(f"asyncpg: {asyncpg.__version__}")
        checks.append(True)
    except ImportError:
        print_error("asyncpg: Not installed")
        checks.append(False)
    
    return all(checks)

def check_database_connection():
    """Check database connectivity"""
    print_header("DATABASE CONNECTION")
    
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print_error("DATABASE_URL not set, skipping connection test")
        return False
    
    try:
        import asyncpg
        import asyncio
        
        async def test_connection():
            try:
                conn = await asyncpg.connect(db_url, timeout=5)
                version = await conn.fetchval('SELECT version()')
                await conn.close()
                return True, version
            except Exception as e:
                return False, str(e)
        
        success, result = asyncio.run(test_connection())
        
        if success:
            print_success("Database connection successful")
            print(f"  PostgreSQL version: {result.split(',')[0]}")
            return True
        else:
            print_error(f"Database connection failed: {result}")
            return False
            
    except Exception as e:
        print_error(f"Could not test database connection: {e}")
        return False

def check_migrations():
    """Check migration files"""
    print_header("DATABASE MIGRATIONS")
    
    migrations_dir = Path(__file__).parent.parent.parent / 'supabase' / 'migrations'
    
    if not migrations_dir.exists():
        print_error(f"Migrations directory not found: {migrations_dir}")
        return False
    
    migration_files = sorted(migrations_dir.glob('*.sql'))
    
    print_success(f"Found {len(migration_files)} migration files:")
    for migration in migration_files:
        print(f"  • {migration.name}")
    
    expected_count = 11  # Update this when adding new migrations
    if len(migration_files) != expected_count:
        print_warning(f"Expected {expected_count} migrations, found {len(migration_files)}")
    
    return True

def main():
    """Main verification function"""
    print_header("YARDA AI LANDSCAPE STUDIO - SETUP VERIFICATION")
    
    results = {}
    
    # Run all checks
    results['backend_env'] = check_backend_env()
    results['frontend_env'] = check_frontend_env()
    results['dependencies'] = check_dependencies()
    results['migrations'] = check_migrations()
    results['database'] = check_database_connection()
    
    # Summary
    print_header("VERIFICATION SUMMARY")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    for check, passed_check in results.items():
        status = "✓ PASS" if passed_check else "✗ FAIL"
        color = Colors.GREEN if passed_check else Colors.RED
        print(f"{color}{status}{Colors.END} - {check.replace('_', ' ').title()}")
    
    print(f"\n{Colors.BOLD}Total: {passed}/{total} checks passed{Colors.END}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ All checks passed! Ready to start development.{Colors.END}")
        print("\nNext steps:")
        print("1. Apply database migrations: python scripts/apply_migrations.py")
        print("2. Start backend server: uvicorn src.main:app --reload")
        print("3. Start frontend server: cd ../frontend && npm run dev")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ Some checks failed. Please review the errors above.{Colors.END}")
        print("\nSee INFRASTRUCTURE_SETUP_COMPLETE.md for configuration instructions.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
