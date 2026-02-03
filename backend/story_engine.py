import yfinance as yf # type: ignore
from datetime import datetime, timedelta, timezone
import json
import asyncio
from openai import AsyncOpenAI
import os
from sqlalchemy.orm import Session # type: ignore
import models
import feedparser # type: ignore
import urllib.parse
from news_scraper import scrape_google_news
from agent_tools import get_current_time
from dotenv import load_dotenv
import logging

logger = logging.getLogger("story_engine")
logger.setLevel(logging.INFO)

load_dotenv()

client = AsyncOpenAI(
    base_url="https://ai.hackclub.com/proxy/v1",
    api_key=os.getenv("HACKCLUB_API_KEY")
)

async def get_recent_news(stock_ticker):
    """
    fetches lastest news for a stock using playwright with rss fallback
    """
    # try playwright scraper
    try:
        articles = await scrape_google_news(stock_ticker, max_results=3)
        if articles:
            top_article = articles[0]
            top_article['method'] = 'playwright'
            return top_article
    except Exception as e:
        print(f"⚠️ [News] playwright failed for {stock_ticker}: {e}")

    # fallback to rss
    try:
        print(f"ℹ️ [News] falling back to rss for {stock_ticker}")
        encoded_ticker = urllib.parse.quote(stock_ticker)
        rss_url = f"https://news.google.com/rss/search?q={encoded_ticker}+stock+australia+when:2d&hl=en-AU&gl=AU&ceid=AU:en"
        
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, lambda: feedparser.parse(rss_url))
        
        now = datetime.now(timezone.utc)
        
        for entry in feed.entries:
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                article_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                age = now - article_date
                
                # return first valid if recent
                if age < timedelta(hours=48):
                    return {
                        "title": entry.title,
                        "publisher": entry.source.title if hasattr(entry, 'source') else "Google News",
                        "source": entry.source.title if hasattr(entry, 'source') else "Google News",
                        "link": entry.link,
                        "time": article_date.strftime("%H:%M"),
                        "method": "rss"
                    }
        return None
    except Exception as e:
        print(f"❌ [News] rss fetch error {stock_ticker}: {e}")
        return None

async def generate_watchlist_stories(db: Session):
    """
    scans watchlist & generates ai stories for events, cached 12h
    """
    watched = db.query(models.Stock).filter(models.Stock.is_watched == True).all()
    
    tasks = []
    final_stories = []
    
    for stock in watched:
        # check cache
        now = datetime.now(timezone.utc)
        cached = db.query(models.StoryCache).filter(
            models.StoryCache.ticker == stock.ticker,
            models.StoryCache.expires_at > now
        ).first()

        if cached:
            try:
                story_data = json.loads(cached.content_json)
                final_stories.append(story_data)
                continue
            except:
                pass # invalid json, regen

        # if not cached, add to task list
        tasks.append(process_stock_story(stock, db))
        
    if tasks:
        results = await asyncio.gather(*tasks)
        for r in results:
            if r:
                final_stories.append(r)
    
    return final_stories

async def process_stock_story(stock, db: Session = None):
    try:
        # check price move (>3%)
        price_condition = False
        change_pct = 0.0
        try:
            # clean string "+1.23%" -> 1.23
            clean_pct = stock.change_percent.replace('%','').replace('+','')
            change_pct = float(clean_pct)
            if abs(change_pct) >= 3.0:
                price_condition = True
        except:
            pass
            
        # check news
        news_item = await get_recent_news(stock.ticker)
        
        # if neither condition is met, no story
        if not price_condition and not news_item:
            return None
            
        # generate story with gemini
        trigger_reason = ""
        if price_condition:
            trigger_reason += f"Big Price Move: ({stock.change_percent}). "
        if news_item:
            trigger_reason += f"Breaking News: {news_item['title']}."
            
        system_prompt = """
        You are an award-winning Visual Designer at a top-tier fintech startup.
        Create STUNNING  Instagram Story slides that look like they belong on Bloomberg or a premium trading app.
        
        [‼️] IMPORTANT: DO NOT just dump data on screen. Tell a VISUAL STORY. Make it have that "wow" factor.
        
        INPUT:
        Stock: {ticker} ({name})
        Price: ${price} ({change})
        Context: {reason}
        Headline: {news_title}
        Details: {news_content}
        
        [🎨] DESIGN SYSTEM - Pick ONE theme:
        
        THEMES (pick based on sentiment):
        • GOLDEN BULL: font="Bebas Neue", gradient=#1a1a0a→#0a0805, primary=#fbbf24, accent=#f59e0b
        • BLOOD RED: font="Oswald", gradient=#1a0505→#0a0000, primary=#ef4444, accent=#fca5a5  
        • OCEAN BLUE: font="Space Grotesk", gradient=#0a0a1a→#0f172a, primary=#3b82f6, accent=#60a5fa
        • NEON CYBER: font="Orbitron", gradient=#0a000a→#1a0a2e, primary=#a855f7, accent=#22d3ee
        • EMERALD: font="Montserrat", gradient=#0a1a0a→#052e16, primary=#22c55e, accent=#86efac
        
        [🖼️] SLIDE STRUCTURE (3 slides, each must have icon + shape + text):
        
        SLIDE 1 - THE HOOK (make the viewer want to stop):
        • Big icon at top (size 72, centered)
        • ONE punchy headline (2-4 words max, 2.8rem, UPPERCASE)
        • Colorful subheadline (1.2rem, use accent color)
        • Decorative shape in background
        
        [🖼️] ICONS LIBRARY (pick the most appropriate for the story):

        Charts/Data: BarChart, BarChart2, BarChart3, LineChart, PieChart, ChartNoAxesCombined, FileBarChart
        Money/Finance: DollarSign, CircleDollarSign, Coins, Wallet, CreditCard, Banknote, BadgeDollarSign, Percent
        Trends: TrendingUp, TrendingDown, TrendingUpDown, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight, CircleArrowUp, CircleArrowDown
        Alerts/Status: AlertTriangle, Bell, ShieldAlert, ShieldCheck, CheckCircle, XCircle, Info, Megaphone
        Business: Building, Building2, Store, Briefcase, Users, Target, Globe, Package, Layers
        Energy/Intensity: Rocket, Zap, Flame, Sparkles, Crown, Star, Trophy
        Misc: Activity, Clock, Calendar, Eye, Lock, Unlock, MessageSquare, Hash, Skull, Mountain, Anchor, Droplets
        
        SLIDE 2 - THE STORY (key insights, not just a data dump):
        • Section title (1.4rem bold)
        • 1-2 SHORT sentences explaining what happened (1rem)
        • If there's a big number, make it HUGE (3rem) and colorful
        • Another background shape for depth
        
        SLIDE 3 - THE TAKEAWAY:
        • Bold conclusion or question (1.6rem)
        • Brief supporting text
        • like a "what's next" moment
        
        [📐] LAYOUT RULES (renderer enforces left:5%, width:90%):
        • Icons: top 10-15%, left 50% (auto-centers)
        • Title: top 26-32%
        • Subtitle: top 44-50%  
        • Body text: top 32-55%
        • Shapes: top 70-90%, large (350-500px), very low opacity (0.04-0.08)
        
        [✨] STYLE TIPS:
        • Headlines: UPPERCASE, letterSpacing "0.08em", fontWeight 900
        • Accent text: Use the accent color, fontWeight 600
        • Body: rgba(255,255,255,0.85), lineHeight 1.6
        • Every slide MUST have at least one shape for visual richness
        • Use textTransform "uppercase" for headlines
        
        [🚫] DO NOT:
        • Dump multiple stats on one line (bad: "CBA: $151.48 (+1.4%) ASX 200: -1.0%")
        • Use boring titles like "By The Numbers"
        • Skip icons or shapes - they're essential
        • Make everything the same size
        
        [✅] DO:
        • Create DRAMA and VISUAL HIERARCHY
        • Use contrasting sizes (3rem vs 1rem)
        • Make key numbers POP with accent colors
        • Add shapes to EVERY slide
        
        OUTPUT (valid JSON only):
        {{
            "design_system": {{
                "font_family": "Font Name",
                "primary_color": "#hex",
                "accent_color": "#hex", 
                "background_gradient": {{ "start": "#hex", "end": "#hex", "direction": "to bottom" }}
            }},
            "slides": [
                {{
                    "elements": [
                        {{ "type": "shape", "shapeType": "circle", "style": {{ "width": "450px", "height": "450px", "top": "75%", "left": "50%", "color": "rgba(251,191,36,0.06)" }} }},
                        {{ "type": "icon", "name": "TrendingUp", "style": {{ "size": "72", "color": "#fbbf24", "top": "12%", "left": "50%" }} }},
                        {{ "type": "text", "content": "BREAKING", "style": {{ "fontSize": "2.8rem", "fontWeight": "900", "color": "#ffffff", "top": "28%", "textAlign": "center", "textTransform": "uppercase", "letterSpacing": "0.08em" }} }},
                        {{ "type": "text", "content": "Stock surges on news", "style": {{ "fontSize": "1.2rem", "fontWeight": "500", "color": "#fbbf24", "top": "44%", "textAlign": "center" }} }}
                    ]
                }},
                {{
                    "elements": [
                        {{ "type": "shape", "shapeType": "circle", "style": {{ "width": "350px", "height": "350px", "top": "80%", "left": "20%", "color": "rgba(251,191,36,0.05)" }} }},
                        {{ "type": "text", "content": "The Move", "style": {{ "fontSize": "1.4rem", "fontWeight": "700", "color": "#ffffff", "top": "15%", "textAlign": "left" }} }},
                        {{ "type": "text", "content": "+5.2%", "style": {{ "fontSize": "3.5rem", "fontWeight": "900", "color": "#fbbf24", "top": "32%", "textAlign": "center" }} }},
                        {{ "type": "text", "content": "Biggest single-day gain this quarter as investors react to earnings beat.", "style": {{ "fontSize": "1rem", "fontWeight": "400", "color": "rgba(255,255,255,0.85)", "top": "52%", "textAlign": "left", "lineHeight": "1.6" }} }}
                    ]
                }},
                {{
                    "elements": [
                        {{ "type": "shape", "shapeType": "circle", "style": {{ "width": "400px", "height": "400px", "top": "78%", "left": "70%", "color": "rgba(251,191,36,0.05)" }} }},
                        {{ "type": "text", "content": "What's Next?", "style": {{ "fontSize": "1.8rem", "fontWeight": "700", "color": "#ffffff", "top": "22%", "textAlign": "center" }} }},
                        {{ "type": "text", "content": "All eyes on the Feb 11 earnings call for guidance.", "style": {{ "fontSize": "1.05rem", "fontWeight": "400", "color": "rgba(255,255,255,0.75)", "top": "40%", "textAlign": "center", "lineHeight": "1.5" }} }}
                    ]
                }}
            ]
        }}
        
        REMEMBER - this should look like an PREMIUM fintech app story, not a boring spreadsheet
        """
        news_title = news_item.get('title', "No Headline") if news_item else "No Headline"
        # truncate content for token limit, 500chars is enough
        news_content = news_item.get('content', '') if news_item else "See details in app." # handle missing content
        if not news_content:
            news_content = news_title # fallback to title if content is empty (RSS)
            
        prompt = system_prompt.format(
            ticker=stock.ticker,
            name=stock.name,
            change=stock.change_percent,
            price=stock.price,
            reason=trigger_reason,
            news_title=news_title,
            news_content=news_content[:1000] # truncate
        )
        
        response = await client.chat.completions.create(
            model="google/gemini-3-flash-preview", # stories need to load fast, can't use pro bc its too slow
            messages=[{"role": "user", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        
        content = response.choices[0].message.content
        design_output = json.loads(content)
        
        final_result = {
            "id": f"story_{stock.ticker}_{int(datetime.now().timestamp())}",
            "ticker": stock.ticker,
            "stock_name": stock.name,
            "change": stock.change_percent,
            "price": stock.price,
            "news": news_item, 
            "design": design_output, 
            "timestamp": datetime.now().isoformat()
        }
        
        # save to cache
        if db:
            try:
                # remove old cache for ticker
                db.query(models.StoryCache).filter(models.StoryCache.ticker == stock.ticker).delete()
                
                # add new
                new_cache = models.StoryCache(
                    ticker=stock.ticker,
                    content_json=json.dumps(final_result),
                    created_at=datetime.now(timezone.utc),
                    expires_at=datetime.now(timezone.utc) + timedelta(hours=12)
                )
                db.add(new_cache)
                db.commit()
            except Exception as db_e:
                print(f"⚠️ [Story] failed to cache story for {stock.ticker}: {db_e}")
                db.rollback()

        return final_result
        
    except Exception as e:
        print(f"story gen error for {stock.ticker}: {e}")
        return None
