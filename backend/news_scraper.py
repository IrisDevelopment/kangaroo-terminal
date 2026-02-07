from newspaper import Article # type: ignore
import asyncio
from playwright.async_api import async_playwright
from datetime import datetime, timedelta
import re

def parse_relative_time(time_str: str) -> str:
    """
    converts google news timestamps ('5 hours ago', '1 day ago', '2 weeks ago') to ISO format
    """
    try:
        now = datetime.now()
        
        time_str = time_str.lower().strip()
        if "yesterday" in time_str:
            return (now - timedelta(days=1)).isoformat()
            
        # regex for quantities
        match = re.search(r'(\d+)\s+(min|minute|hour|day|week|month)s?', time_str)
        if match:
            val = int(match.group(1))
            unit = match.group(2)
            
            if 'min' in unit:
                dt = now - timedelta(minutes=val)
            elif 'hour' in unit:
                dt = now - timedelta(hours=val)
            elif 'day' in unit:
                dt = now - timedelta(days=val)
            elif 'week' in unit:
                dt = now - timedelta(weeks=val)
            elif 'month' in unit:
                dt = now - timedelta(days=val*30)
            else:
                dt = now
            return dt.isoformat()
            
        return now.isoformat()
    except:
        return datetime.now().isoformat()

async def scrape_google_news(ticker: str, max_results: int = 5):
    """
    scrapes first 2 pages (20 results) of google news using playwright for a ticker
    """
    print(f"🕵️ [News Scraper] starting playwright scan for {ticker}...")
    
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled", # bypass bot detection (recaptcha)
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                    "--window-position=0,0",
                    "--ignore-certifcate-errors",
                    "--ignore-certifcate-errors-spki-list",
                    "--disable-accelerated-2d-canvas",
                    "--disable-gpu",
                    "--window-size=1920,1080",
                ]
            )
            
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=1,
                is_mobile=False,
                has_touch=False,
                locale="en-AU",
                timezone_id="Australia/Sydney",
                permissions=["geolocation"],
                java_script_enabled=True,
            )
            
            # bypass bot detection (recaptcha)
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)
            
            page = await context.new_page()
            
            query = f"{ticker} ASX" # eg 'BHP ASX'
            # tbs=qdr:m filters to filter for only past month
            base_url = f"https://www.google.com/search?q={query}&tbm=nws&gl=au&hl=en&tbs=qdr:m"
            
            found_items = []
            
            # loop for 2 pages
            for page_idx in range(2):
                current_url = f"{base_url}&start={page_idx * 10}" if page_idx > 0 else base_url
                print(f"📖 [News Scraper] scanning page {page_idx+1} for {ticker}...")
                
                await page.goto(current_url, timeout=30000)
                
                # wait for search results with multiple fallback selectors
                try:
                    await page.wait_for_selector('div#search', timeout=20000)
                except:
                    # try fallback selectors
                    try:
                        await page.wait_for_selector('#rso', timeout=5000)
                    except:
                        try:
                            await page.wait_for_selector('[data-sokoban-container]', timeout=5000)
                        except:
                            print(f"⚠️ [News Scraper] timeout waiting for results on page {page_idx+1}")
                            break
                
                cards = await page.query_selector_all('div.SoaBEf')
                if not cards:
                    cards = await page.query_selector_all('div[data-snet="1"]')
                    
                # extraction
                for card in cards:
                    if len(found_items) >= max_results * 2:  
                        break

                    try:
                        # title
                        title_el = await card.query_selector('div[role="heading"]') 
                        if not title_el: title_el = await card.query_selector('.mCBkyc')
                        title = await title_el.inner_text() if title_el else "Unknown Title"
                        
                        # link
                        link_el = await card.query_selector('a')
                        link = await link_el.get_attribute('href') if link_el else ""
                        
                        # source
                        source_el = await card.query_selector('.CEMjEf span') 
                        if not source_el: source_el = await card.query_selector('.NUnG9d span')
                        source = await source_el.inner_text() if source_el else "Google News"
                        
                        # time
                        time_el = await card.query_selector('.OSrXXb span')
                        if not time_el: time_el = await card.query_selector('.OSrXXb')
                        time_str = await time_el.inner_text() if time_el else ""
                        iso_date = parse_relative_time(time_str)

                        # snippet
                        snippet = "No description available."
                        
                        # description
                        snippet_el = await card.query_selector('.GI74Re')
                        if not snippet_el: snippet_el = await card.query_selector('.Bifec')
                        if not snippet_el: snippet_el = await card.query_selector('.Y35FCc') 
                        
                        if snippet_el:
                            snippet = await snippet_el.inner_text()
                        else:
                            # text content fallback
                            try:
                                full_text = await card.inner_text()
                                clean_text = full_text.replace(title, "").replace(source, "").replace(time_str, "")
                                clean_text = " ".join(clean_text.split()).strip()
                                if len(clean_text) > 10: 
                                    snippet = clean_text
                            except:
                                pass
                        
                        if title and link:
                            # avoid weird duplicates
                            if not any(x['link'] == link for x in found_items):
                                found_items.append({
                                    "title": title,
                                    "source": source,
                                    "link": link,
                                    "time": iso_date, # return ISO date
                                    "original_time": time_str,
                                    "snippet": snippet
                                })
                    except Exception as e:
                        continue

                if page_idx < 1:  # don't delay after last page
                    await asyncio.sleep(2)
                
                if len(found_items) >= max_results:
                    break
            
            # initialize articles list
            articles = []
            
            # read top result full content
            if found_items:
                top_item = found_items[0]
                print(f"📖 [News Scraper] reading full content for: {top_item['title']}")
                try:
                    await page.goto(top_item['link'], timeout=15000, wait_until="domcontentloaded")                    
                    html_content = await page.content()
                
                    article = Article(top_item['link'])
                    article.set_html(html_content)
                    article.parse()
                    
                    top_item['content'] = article.text
                    print(f"✅ [News Scraper] extracted {len(article.text)} chars via newspaper3k")
                    
                except Exception as e:
                    print(f"⚠️ [News Scraper] failed to extracting full content: {e}")
                    top_item['content'] = top_item['title'] # fallback
                    
                articles = found_items
            else:
                articles = []
            
            await browser.close()
            return articles
            
        except Exception as e:
            print(f"❌ [News Scraper] critical failure for {ticker}: {e}")
            return []
