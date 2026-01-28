#!/usr/bin/env node
/**
 * Email Verification Script
 * Verifies emails using ZeroBounce API before delivery
 * 
 * Usage: node verify-emails.js input.csv output.csv
 * 
 * Requires: ZEROBOUNCE_API_KEY environment variable
 * Get API key: https://www.zerobounce.net/
 * Pricing: ~$0.005 per email (500 emails = $2.50)
 */

const fs = require('fs');
const https = require('https');

const API_KEY = process.env.ZEROBOUNCE_API_KEY;

if (!API_KEY) {
  console.error('Error: ZEROBOUNCE_API_KEY environment variable required');
  console.error('Get your API key at: https://www.zerobounce.net/');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3] || 'verified-leads.csv';

if (!inputFile) {
  console.error('Usage: node verify-emails.js <input.csv> [output.csv]');
  process.exit(1);
}

function verifyEmail(email) {
  return new Promise((resolve, reject) => {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${API_KEY}&email=${encodeURIComponent(email)}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            email,
            status: result.status,
            valid: result.status === 'valid',
            subStatus: result.sub_status || '',
            freeEmail: result.free_email || false
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('📧 Email Verification Script');
  console.log('============================\n');

  // Read CSV
  const content = fs.readFileSync(inputFile, 'utf8');
  const lines = content.trim().split('\n');
  const header = lines[0];
  const rows = lines.slice(1);

  // Find email column
  const headers = header.split(',').map(h => h.trim().toLowerCase());
  const emailIndex = headers.findIndex(h => h.includes('email'));
  
  if (emailIndex === -1) {
    console.error('Error: No email column found in CSV');
    process.exit(1);
  }

  console.log(`Found ${rows.length} leads to verify\n`);

  const verified = [];
  const invalid = [];
  let processed = 0;

  for (const row of rows) {
    const cols = row.split(',');
    const email = cols[emailIndex]?.trim();
    
    if (!email || !email.includes('@')) {
      invalid.push({ row, reason: 'Invalid format' });
      continue;
    }

    try {
      const result = await verifyEmail(email);
      processed++;
      
      if (result.valid) {
        verified.push(row);
        process.stdout.write(`✓ ${email}\n`);
      } else {
        invalid.push({ row, reason: result.status + ' - ' + result.subStatus });
        process.stdout.write(`✗ ${email} (${result.status})\n`);
      }

      // Rate limit: 100 requests per 10 seconds
      if (processed % 10 === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.error(`Error verifying ${email}:`, e.message);
      // Keep the lead if verification fails (don't lose data)
      verified.push(row);
    }
  }

  // Write verified leads
  const output = [header, ...verified].join('\n');
  fs.writeFileSync(outputFile, output);

  console.log('\n============================');
  console.log(`✅ Verified: ${verified.length} leads`);
  console.log(`❌ Invalid: ${invalid.length} leads`);
  console.log(`📁 Output: ${outputFile}`);
  
  // Write invalid leads for review
  if (invalid.length > 0) {
    const invalidFile = outputFile.replace('.csv', '-invalid.csv');
    const invalidOutput = [header, ...invalid.map(i => i.row)].join('\n');
    fs.writeFileSync(invalidFile, invalidOutput);
    console.log(`📁 Invalid leads: ${invalidFile}`);
  }
}

main().catch(console.error);
