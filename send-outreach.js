#!/usr/bin/env node
/**
 * Send cold outreach to marketing agencies
 */

const fs = require('fs');
try { require('dotenv').config(); } catch(e) {}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

const EMAIL_TEMPLATE = (agency) => ({
  subject: `Quick question about your trade clients`,
  text: `Hey,

Saw ${agency.name} does marketing for tradies.

Quick question: are your clients always asking for more leads?

We specialize in generating verified trade business leads (lawn care, plumbing, HVAC, etc.) - emails, phones, websites, all validated.

500 leads, 48hr delivery, $997.

Could be a nice add-on service for your agency, or just fuel for your clients' pipelines.

Worth a quick chat?

Cheers,
Tom
LeadFlow
https://henry-bonvi.github.io/leadflow-agency/

P.S. Happy to send a free sample of 50 leads so you can see the quality.`
});

async function sendEmail(to, subject, text) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'tom@yardpilot.io', name: 'Tom from LeadFlow' },
      subject,
      content: [{ type: 'text/plain', value: text }]
    })
  });
  
  return response.ok;
}

async function main() {
  const agencies = JSON.parse(fs.readFileSync('agencies-with-emails.json', 'utf8'));
  const dryRun = process.argv.includes('--dry-run');
  const limit = parseInt(process.argv[2]) || 10;
  
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Sending to ${Math.min(limit, agencies.length)} agencies...\n`);
  
  let sent = 0;
  for (let i = 0; i < Math.min(limit, agencies.length); i++) {
    const agency = agencies[i];
    const { subject, text } = EMAIL_TEMPLATE(agency);
    
    if (dryRun) {
      console.log(`Would send to: ${agency.email} (${agency.name})`);
      sent++;
    } else {
      const ok = await sendEmail(agency.email, subject, text);
      if (ok) {
        console.log(`✓ Sent to ${agency.email} (${agency.name})`);
        sent++;
      } else {
        console.log(`✗ Failed: ${agency.email}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  console.log(`\n${dryRun ? 'Would send' : 'Sent'}: ${sent} emails`);
}

main().catch(console.error);
