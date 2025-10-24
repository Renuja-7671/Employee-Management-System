// test-db-connection.js
// Simple script to test database connectivity

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Try to connect and run a simple query
    await prisma.$connect();
    console.log('✅ Successfully connected to database!\n');

    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Database is working! Found ${userCount} users.\n`);

    return true;
  } catch (error) {
    console.log('❌ Database connection failed!\n');
    console.log('Error details:');
    console.log('Message:', error.message);
    console.log('Code:', error.code);
    console.log('\n');

    if (error.message.includes("Can't reach database server")) {
      console.log('💡 Possible solutions:');
      console.log('1. Check if Supabase project is paused (go to supabase.com/dashboard)');
      console.log('2. Click "Resume" or "Restore" button if paused');
      console.log('3. Wait 1-2 minutes for database to start');
      console.log('4. Check your internet connection');
      console.log('5. Verify DATABASE_URL in .env.local is correct\n');
    }

    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
