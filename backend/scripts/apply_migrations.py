#!/usr/bin/env python3
"""
Database Migration Script
Applies all SQL migrations from supabase/migrations/ directory
"""
import os
import sys
from pathlib import Path
import asyncpg
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv()

async def get_database_url():
    """Get database URL from environment"""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        print("Please set DATABASE_URL in backend/.env file")
        sys.exit(1)
    return db_url

async def check_migration_applied(conn, migration_name):
    """Check if migration has been applied by looking for migration tracking table"""
    try:
        # Check if migrations table exists
        result = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'schema_migrations'
            )
        """)
        
        if not result:
            # Create migrations tracking table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    migration_name VARCHAR(255) UNIQUE NOT NULL,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                )
            """)
            return False
        
        # Check if specific migration was applied
        result = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE migration_name = $1)",
            migration_name
        )
        return result
    except Exception as e:
        print(f"Warning: Could not check migration status: {e}")
        return False

async def mark_migration_applied(conn, migration_name):
    """Mark migration as applied"""
    await conn.execute(
        "INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING",
        migration_name
    )

async def apply_migration(conn, migration_file):
    """Apply a single migration file"""
    migration_name = migration_file.name
    
    # Check if already applied
    if await check_migration_applied(conn, migration_name):
        print(f"  ✓ {migration_name} (already applied)")
        return True
    
    print(f"  → Applying {migration_name}...")
    
    try:
        # Read migration file
        sql = migration_file.read_text()
        
        # Execute migration in a transaction
        async with conn.transaction():
            await conn.execute(sql)
            await mark_migration_applied(conn, migration_name)
        
        print(f"  ✓ {migration_name} (success)")
        return True
    except Exception as e:
        print(f"  ✗ {migration_name} (failed)")
        print(f"    Error: {e}")
        return False

async def verify_setup(conn):
    """Verify database setup"""
    print("\n" + "="*60)
    print("VERIFICATION")
    print("="*60)
    
    # Check tables
    tables = await conn.fetch("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'schema_migrations'
        ORDER BY table_name
    """)
    
    print(f"\nTables created ({len(tables)}):")
    for table in tables:
        print(f"  ✓ {table['table_name']}")
    
    # Check functions
    functions = await conn.fetch("""
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        ORDER BY routine_name
    """)
    
    print(f"\nFunctions created ({len(functions)}):")
    for func in functions:
        print(f"  ✓ {func['routine_name']}")
    
    # Check for data integrity issues
    print("\nData Integrity Checks:")
    
    # Check for negative token balances
    negative_balances = await conn.fetchval(
        "SELECT COUNT(*) FROM users_token_accounts WHERE balance < 0"
    )
    if negative_balances == 0:
        print("  ✓ No negative token balances")
    else:
        print(f"  ✗ Found {negative_balances} accounts with negative balances")
    
    # Check for negative trial credits
    negative_trials = await conn.fetchval(
        "SELECT COUNT(*) FROM users WHERE trial_remaining < 0"
    )
    if negative_trials == 0:
        print("  ✓ No negative trial credits")
    else:
        print(f"  ✗ Found {negative_trials} users with negative trial credits")
    
    print("\n" + "="*60)
    print("Verification complete!")
    print("="*60)

async def main():
    """Main migration script"""
    print("="*60)
    print("DATABASE MIGRATION SCRIPT")
    print("="*60)
    
    # Get database URL
    db_url = await get_database_url()
    print(f"\nDatabase: {db_url.split('@')[1] if '@' in db_url else 'configured'}")
    
    # Find migration files
    migrations_dir = Path(__file__).parent.parent.parent / "supabase" / "migrations"
    if not migrations_dir.exists():
        print(f"ERROR: Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    migration_files = sorted(migrations_dir.glob("*.sql"))
    print(f"\nFound {len(migration_files)} migration files")
    
    # Connect to database
    print("\nConnecting to database...")
    try:
        conn = await asyncpg.connect(db_url)
        print("✓ Connected successfully")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        sys.exit(1)
    
    try:
        # Apply migrations
        print("\n" + "-"*60)
        print("APPLYING MIGRATIONS")
        print("-"*60 + "\n")
        
        success_count = 0
        for migration_file in migration_files:
            if await apply_migration(conn, migration_file):
                success_count += 1
            else:
                print(f"\n✗ Migration failed: {migration_file.name}")
                print("Stopping migration process.")
                sys.exit(1)
        
        print(f"\n✓ Successfully applied {success_count}/{len(migration_files)} migrations")
        
        # Verify setup
        await verify_setup(conn)
        
    finally:
        await conn.close()
        print("\n✓ Database connection closed")
    
    print("\n" + "="*60)
    print("MIGRATION COMPLETE")
    print("="*60)
    print("\nNext steps:")
    print("1. Start the backend server: cd backend && source venv/bin/activate && uvicorn src.main:app --reload")
    print("2. Start the frontend server: cd frontend && npm run dev")
    print("3. Test the application at http://localhost:3000")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
