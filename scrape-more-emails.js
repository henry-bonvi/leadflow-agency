#!/usr/bin/env node
/**
 * Quick email scraper - gets emails from remaining agencies
 */

const fs = require('fs');

async function scrapeEmail(url) {
  try {
    if (!url.startsWith('http')) url = 'https://' + url;
    const baseUrl = new URL(url).origin;
    
    const pagesToTry = [baseUrl, baseUrl + '/contact', baseUrl + '/contact-us', baseUrl + '/about'];
    
    for (const pageUrl of pagesToTry) {
      try {
        const response = await fetch(pageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
          signal: AbortSignal.timeout(8000)
        });
        
        if (!response.ok) continue;
        const html = await response.text();
        
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = (html.match(emailRegex) || []).filter(e => 
          !e.includes('example') && !e.includes('domain') && 
          !e.includes('sentry') && !e.includes('wix') &&
          !e.includes('.png') && !e.includes('.jpg') &&
          !e.includes('mysite') && !e.includes('email.com')
        );
        
        if (emails.length > 0) {
          return emails.find(e => /^(info|contact|hello|enquir)/i.test(e)) || emails[0];
        }
      } catch (e) { continue; }
    }
    return null;
  } catch (e) { return null; }
}

async function main() {
  const allAgencies = JSON.parse(fs.readFileSync('agencies.json', 'utf8'));
  const existing = JSON.parse(fs.readFileSync('agencies-with-emails.json', 'utf8'));
  const existingEmails = new Set(existing.map(a => a.email));
  
  // Find agencies we haven't scraped yet
  const toScrape = allAgencies.filter(a => {
    const found = existing.find(e => e.website === a.website || e.name === a.name);
    return !found;
  });
  
  console.log(`Scraping ${toScrape.length} remaining agencies...`);
  
  let newFound = 0;
  for (let i = 0; i < toScrape.length; i++) {
    const agency = toScrape[i];
    process.stdout.write(`[${i+1}/${toScrape.length}] ${agency.name.substring(0,30)}... `);
    
    const email = await scrapeEmail(agency.website);
    if (email && !existingEmails.has(email)) {
      console.log(email);
      existing.push({ ...agency, email });
      existingEmails.add(email);
      newFound++;
    } else {
      console.log(email ? 'duplicate' : 'no email');
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  fs.writeFileSync('agencies-with-emails.json', JSON.stringify(existing, null, 2));
  console.log(`\nAdded ${newFound} new agencies. Total: ${existing.length}`);
}

main().catch(console.error);
