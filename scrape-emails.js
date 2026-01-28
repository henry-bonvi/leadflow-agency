#!/usr/bin/env node
/**
 * Scrape emails from agency websites
 */

const fs = require('fs');

async function scrapeEmail(url) {
  try {
    // Normalize URL
    if (!url.startsWith('http')) url = 'https://' + url;
    const baseUrl = new URL(url).origin;
    
    // Try main page and contact page
    const pagesToTry = [url, baseUrl, baseUrl + '/contact', baseUrl + '/contact-us', baseUrl + '/about'];
    
    for (const pageUrl of pagesToTry) {
      try {
        const response = await fetch(pageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)' },
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) continue;
        
        const html = await response.text();
        
        // Find emails
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = html.match(emailRegex) || [];
        
        // Filter out common junk
        const validEmails = emails.filter(e => 
          !e.includes('example.com') &&
          !e.includes('domain.com') &&
          !e.includes('email.com') &&
          !e.includes('yoursite') &&
          !e.includes('sentry') &&
          !e.includes('wix') &&
          !e.includes('.png') &&
          !e.includes('.jpg')
        );
        
        if (validEmails.length > 0) {
          // Prefer info@, contact@, hello@
          const preferred = validEmails.find(e => 
            e.startsWith('info@') || 
            e.startsWith('contact@') || 
            e.startsWith('hello@') ||
            e.startsWith('enquiries@')
          );
          return preferred || validEmails[0];
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const agencies = JSON.parse(fs.readFileSync('agencies.json', 'utf8'));
  const results = [];
  
  console.log(`Scraping emails from ${agencies.length} agencies...`);
  
  for (let i = 0; i < agencies.length; i++) {
    const agency = agencies[i];
    process.stdout.write(`[${i+1}/${agencies.length}] ${agency.name}... `);
    
    const email = await scrapeEmail(agency.website);
    
    if (email) {
      console.log(email);
      results.push({ ...agency, email });
    } else {
      console.log('no email found');
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\nFound emails for ${results.length}/${agencies.length} agencies`);
  fs.writeFileSync('agencies-with-emails.json', JSON.stringify(results, null, 2));
  console.log('Saved to agencies-with-emails.json');
}

main().catch(console.error);
