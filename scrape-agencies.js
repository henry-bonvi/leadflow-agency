#!/usr/bin/env node
/**
 * Scrape marketing agencies that serve trade businesses
 */

const fs = require('fs');
try { require('dotenv').config(); } catch(e) {}

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

async function searchPlaces(query, location = 'Australia') {
  const url = `https://places.googleapis.com/v1/places:searchText`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber'
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        rectangle: {
          low: { latitude: -44.0, longitude: 112.0 },
          high: { latitude: -10.0, longitude: 154.0 }
        }
      },
      maxResultCount: 20
    })
  });
  
  const data = await response.json();
  return data.places || [];
}

async function main() {
  const queries = [
    'marketing agency for tradies',
    'digital marketing home services',
    'marketing agency plumbers electricians',
    'tradie marketing australia',
    'home service business marketing'
  ];
  
  const allAgencies = [];
  
  for (const query of queries) {
    console.log(`Searching: ${query}`);
    const places = await searchPlaces(query);
    
    for (const place of places) {
      if (place.websiteUri) {
        allAgencies.push({
          name: place.displayName?.text || 'Unknown',
          website: place.websiteUri,
          phone: place.nationalPhoneNumber,
          address: place.formattedAddress
        });
        console.log(`  Found: ${place.displayName?.text}`);
      }
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Dedupe by website
  const unique = [...new Map(allAgencies.map(a => [a.website, a])).values()];
  
  console.log(`\nFound ${unique.length} unique agencies`);
  fs.writeFileSync('agencies.json', JSON.stringify(unique, null, 2));
  console.log('Saved to agencies.json');
}

main().catch(console.error);
