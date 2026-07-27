'use strict';

const { chromium } = require('playwright');
const fs           = require('fs').promises;
const path         = require('path');
const https        = require('https');
const contacts     = require('./contacts');
const { embed, buildTextBlob } = require('./embeddings');
const vectorStore  = require('./vectorStore');

let _browser = null;
let _starting = null;

async function getBrowser() {
  if (_browser) return _browser;
  if (_starting) return _starting;

  _starting = (async () => {
    console.log('[scraper] launching headless Chromium…');
    _browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    _browser.on('disconnected', () => {
      console.log('[scraper] browser disconnected — will relaunch on next scrape');
      _browser = null;
      _starting = null;
    });
    console.log('[scraper] browser ready');
    return _browser;
  })();

  _browser = await _starting;
  _starting = null;
  return _browser;
}

async function downloadAvatar(url, filenamePrefix) {
  if (!url) return '';

  const avatarsDir = path.join(__dirname, '..', 'public', 'avatars');
  try {
    await fs.mkdir(avatarsDir, { recursive: true });
  } catch {}

  const ext      = url.includes('.png') ? 'png' : 'jpg';
  const fileName = `${filenamePrefix}.${ext}`;
  const filePath = path.join(avatarsDir, fileName);
  const webPath  = `/avatars/${fileName}`;

  return new Promise((resolve) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/'
      }
    }, (response) => {
      if (response.statusCode !== 200) {
        console.warn(`[scraper] avatar download failed, status: ${response.statusCode}`);
        resolve('');
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(filePath, buffer);
          resolve(webPath);
        } catch (err) {
          console.warn(`[scraper] avatar save failed: ${err.message}`);
          resolve('');
        }
      });
    });

    request.on('error', (err) => {
      console.warn(`[scraper] avatar request failed: ${err.message}`);
      resolve('');
    });
  });
}

let _queue = Promise.resolve();

function enqueue(fn) {
  _queue = _queue.then(fn).catch(() => {});
}

async function newPage(browser) {
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-GB,en;q=0.9',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  });

  await page.setViewportSize({ width: 1280, height: 800 });

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return page;
}

async function scrapeLinkedIn(username) {
  const result = { fullName: '', headline: '', about: '', company: '', location: '', photoUrl: '', experience: [] };
  if (!username) return result;

  const url = `https://www.linkedin.com/in/${encodeURIComponent(username)}/`;
  let page;

  try {
    const browser = await getBrowser();
    page = await newPage(browser);

    console.log(`[scraper] LinkedIn → ${url}`);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (response && response.status() === 404) {
      console.log(`[scraper] LinkedIn 404 for ${username}`);
      return result;
    }

    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

    result.fullName = await page.$eval('h1', el => el.innerText.trim()).catch(() => '');
    result.headline = await page.$eval('.text-body-medium.break-words', el => el.innerText.trim()).catch(() => '');
    result.location = await page.$eval('.text-body-small.inline.t-black--light.break-words', el => el.innerText.trim()).catch(() => '');
    result.about    = await page.$eval('#about ~ div .inline-show-more-text', el => el.innerText.trim()).catch(() => '');
    result.photoUrl = await page.$eval('img.pv-top-card-profile-picture__image', el => el.src).catch(() => '');

    const expItems = await page.$$eval(
      '#experience ~ div li.artdeco-list__item',
      items => items.slice(0, 3).map(el => ({
        title:   el.querySelector('.t-bold span[aria-hidden]')?.innerText?.trim() || '',
        company: el.querySelector('.t-14.t-normal span[aria-hidden]')?.innerText?.trim() || '',
      }))
    ).catch(() => []);
    result.experience = expItems;

    console.log(`[scraper] LinkedIn ✓ ${username} — "${result.headline}"`);
  } catch (err) {
    console.warn(`[scraper] LinkedIn failed for ${username}: ${err.message}`);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return result;
}

function parseMetaDesc(content) {
  const result = {};

  const parseAbbreviatedNumber = (s) => {
    if (!s) return 0;
    const cleaned = s.replace(/,/g, '').trim().toLowerCase();
    let multiplier = 1;
    if (cleaned.endsWith('k')) multiplier = 1000;
    else if (cleaned.endsWith('m')) multiplier = 1000000;
    const num = parseFloat(cleaned);
    return Math.round(num * multiplier);
  };

  const followersMatch = content.match(/(\d+[\d,\.\s]*[KkMm]?)\s*followers/i);
  if (followersMatch) result.followers = parseAbbreviatedNumber(followersMatch[1]);

  const followingMatch = content.match(/(\d+[\d,\.\s]*[KkMm]?)\s*following/i);
  if (followingMatch) result.following = parseAbbreviatedNumber(followingMatch[1]);

  const postsMatch = content.match(/(\d+[\d,\.\s]*[KkMm]?)\s*posts/i);
  if (postsMatch) result.posts = parseAbbreviatedNumber(postsMatch[1]);

  const nameUserMatch = content.match(/(?:–|-)\s*([^\(]+)\s*\((@[^\)]+)\)/);
  if (nameUserMatch) {
    let name = nameUserMatch[1].trim();
    const prefix = 'See Instagram photos and videos from ';
    if (name.startsWith(prefix)) name = name.slice(prefix.length).trim();
    result.displayName = name;
  }

  const bioMatch = content.match(/on Instagram:\s*"([^"]+)"/);
  if (bioMatch) result.bio = bioMatch[1].trim();

  return result;
}

async function scrapeInstagram(username) {
  const result = { displayName: '', bio: '', followers: 0, following: 0, posts: 0, photoUrl: '', verified: false };
  if (!username) return result;

  const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  let page;

  try {
    const browser = await getBrowser();
    page = await newPage(browser);

    console.log(`[scraper] Instagram → ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const metaDesc = await page.$eval('meta[name="description"]', el => el.content).catch(() => '');
    if (metaDesc) Object.assign(result, parseMetaDesc(metaDesc));

    await page.waitForSelector('header', { timeout: 5000 }).catch(() => {});

    result.photoUrl = await page.$eval('header img', el => el.src).catch(() => '');
    result.verified = await page.$('header [aria-label*="Verified"]').then(el => !!el).catch(() => false);

    if (!result.displayName || result.displayName.includes('See Instagram')) {
      const domName = await page.$eval('header section h2, header section h1', el => el.innerText.trim()).catch(() => '');
      if (domName && domName !== username) result.displayName = domName;
    }

    if (!result.bio) {
      const bioText = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return '';
        const section = header.querySelector('section');
        if (!section) return '';
        const divs = Array.from(section.children);
        const lastDiv = divs[divs.length - 1];
        if (lastDiv && !lastDiv.querySelector('ul')) return lastDiv.innerText.trim();
        return '';
      });

      if (bioText) {
        let cleanBio = bioText;
        if (result.displayName && cleanBio.startsWith(result.displayName)) {
          cleanBio = cleanBio.slice(result.displayName.length).trim();
        }
        result.bio = cleanBio;
      }
    }

    console.log(`[scraper] Instagram ✓ ${username} — ${result.followers} followers`);
  } catch (err) {
    console.warn(`[scraper] Instagram failed for ${username}: ${err.message}`);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return result;
}

function enrichContact(contactId, instagram, linkedin) {
  enqueue(async () => {
    console.log(`[scraper] enriching ${contactId}…`);

    let liData = {};
    let igData = {};
    let status = 'success';

    try {
      if (linkedin)  liData = await scrapeLinkedIn(linkedin);
      if (instagram) igData = await scrapeInstagram(instagram);
    } catch (err) {
      console.error(`[scraper] enrichment error for ${contactId}:`, err.message);
      status = 'failed';
    }

    if (!liData.headline && !igData.displayName && (linkedin || instagram)) {
      status = 'partial';
    }

    if (liData.photoUrl) {
      const localPath = await downloadAvatar(liData.photoUrl, `${contactId}-linkedin`);
      if (localPath) liData.photoUrl = localPath;
    }
    if (igData.photoUrl) {
      const localPath = await downloadAvatar(igData.photoUrl, `${contactId}-instagram`);
      if (localPath) igData.photoUrl = localPath;
    }

    const enrichedFields = {
      enriched: {
        scrapedAt: new Date().toISOString(),
        status,
        linkedin:  liData,
        instagram: igData,
      }
    };

    const updated = await contacts.updateById(contactId, enrichedFields);
    if (!updated) {
      console.warn(`[scraper] contact ${contactId} not found during enrichment`);
      return;
    }

    try {
      const blob   = buildTextBlob(updated);
      const vector = await embed(blob);
      await vectorStore.upsert(contactId, vector, updated);
      console.log(`[scraper] re-indexed ${contactId}`);
    } catch (err) {
      console.warn(`[scraper] re-index failed for ${contactId}: ${err.message}`);
    }
  });
}

async function shutdown() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

module.exports = { enrichContact, scrapeLinkedIn, scrapeInstagram, downloadAvatar, shutdown };
