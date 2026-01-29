#!/usr/bin/env node

/**
 * Test Script for Expired Cover Request Cleanup
 * 
 * This script tests the cleanup cron job locally
 * Usage: node scripts/test-expired-cleanup.js
 */

import 'dotenv/config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

async function testCleanup() {
  console.log('🧹 Testing Expired Cover Request Cleanup...\n');
  console.log('API URL:', API_URL);
  console.log('Using CRON_SECRET:', CRON_SECRET ? '✓ Yes' : '✗ No\n');

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }

    console.log('📡 Calling cleanup endpoint...\n');

    const response = await fetch(`${API_URL}/api/cron/cleanup-expired-covers`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Cleanup executed successfully!');
      if (data.summary) {
        console.log('\n📈 Summary:');
        console.log(`   Total Expired: ${data.summary.totalExpired}`);
        console.log(`   Successfully Cleaned: ${data.summary.successfullyCleaned}`);
        console.log(`   Notifications Sent: ${data.summary.notificationsSent}`);
        console.log(`   Errors: ${data.summary.errors}`);
      }
    } else {
      console.log('\n❌ Cleanup failed:', data.error);
    }
  } catch (error) {
    console.error('\n❌ Error testing cleanup:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your development server is running:');
      console.log('   npm run dev');
    }
  }
}

testCleanup();
