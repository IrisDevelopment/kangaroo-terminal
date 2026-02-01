import yfinance as yf # type: ignore
import pandas as pd
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session # type: ignore
from models import EventCache
from browser_use import Agent, Browser, ChatOpenAI # type: ignore
from dotenv import load_dotenv
import os

load_dotenv()
HACKCLUB_KEY = os.getenv("HACKCLUB_API_KEY")

import numpy as np
from database import SessionLocal

SEARCHING_CACHE = set()

async def get_volatile_days(ticker: str):
    """
    fetches 1y history & identifies top 5d volatile
    """
    try:
        # fetch 1y history
        sym = f"{ticker.upper()}.AX"
        stock = yf.Ticker(sym)
        hist = stock.history(period="1y")
        
        if hist.empty:
            return []
            
        # calculate daily return
        hist['Return'] = hist['Close'].pct_change().abs() * 100
        hist['Vol_Avg'] = hist['Volume'].rolling(window=20).mean()
        hist['Vol_Ratio'] = hist['Volume'] / hist['Vol_Avg']
        
        # filter significant moves
        # price > 4% OR vol > 3x average
        significant = hist[
            (hist['Return'] > 4) | (hist['Vol_Ratio'] > 3)
        ].copy()
        
        # sort by magnitude
        significant.sort_values('Return', ascending=False, inplace=True)
        
        significant = significant.replace({np.nan: 0, np.inf: 0, -np.inf: 0})
        
        top_events = []
        for date, row in significant.head(5).iterrows():
            top_events.append({
                "date": date.strftime('%Y-%m-%d'),
                "change": float(row['Return']) if pd.notnull(row['Return']) else 0.0,
                "volume_ratio": float(row['Vol_Ratio']) if pd.notnull(row['Vol_Ratio']) else 0.0,
                "close": float(row['Close'])
            })
            
        return top_events
        
    except Exception as e:
        print(f"Error fetching volatility for {ticker}: {e}")
        return []

async def research_event(ticker: str, date: str):
    """
    Uses AI agent to find the reason for a stock move on a specific date.
    """
    if not HACKCLUB_KEY:
        return {"title": "Error", "reason": "API Key Missing", "source": ""}

    task = f"""
    Research the specific reason for {ticker}'s significant price move on {date}.
    
    1. Search for "{ticker} stock news {date}" or "{ticker} ASX announcement {date}".
    2. Prioritize major financial news outlets (Yahoo Finance, AFR, ABC News, MarketIndex) over heavy corporate websites.
    3. VERIFY the date of the news matches {date} (or the previous trading day in case there is something relevant that occured which might've influenced the move).
    4. Ignore general market reports unless there is no specific company news.
    
    Output a concise reason in this format:
    Title: [Headline, e.g. "FY25 Guidance Downgrade"]
    Reason: [1-2 sentence explanation citing the specific event]
    Source: [URL of the source]
    """

    try:
        llm = ChatOpenAI(
            base_url="https://ai.hackclub.com/proxy/v1",
            api_key=HACKCLUB_KEY,
            model="google/gemini-3-flash-preview" 
        )
        
        browser = Browser(
            headless=True,
            disable_security=True,
            args=[
                "--no-sandbox", 
                "--disable-setuid-sandbox", 
                "--disable-dev-shm-usage", 
                "--disable-blink-features=AutomationControlled", 
                "--disable-infobars", 
                "--window-size=1280,720", 
                "--blink-settings=imagesEnabled=false", # disable images in attempt to make this faster (? maybe remove)
                "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ]
        )
        
        agent = Agent(
            task=task,
            llm=llm,
            browser=browser,
            use_vision=False # disabled 
        )
        
        history = await agent.run(max_steps=10) 
        result = history.final_result()
        
        try:
            await browser.close()
        except:
            pass
        
        # parse the result
        title = "Unknown"
        reason = result
        source = ""
        
        if result:
            lines = result.split('\n')
            for line in lines:
                if line.strip().lower().startswith("title:"):
                    title = line.split(":", 1)[1].strip()
                if line.strip().lower().startswith("reason:"):
                    reason = line.split(":", 1)[1].strip()
                if line.strip().lower().startswith("source:"):
                    source = line.split(":", 1)[1].strip()
        
        # validation: Don't return if it looks like a failure
        if "unknown" in title.lower() or "error" in title.lower() or "no specific catalyst" in title.lower():
            return None

        return {
            "title": title,
            "reason": reason,
            "source": source
        }
        
    except Exception as e:
        print(f"Agent error for {ticker} on {date}: {e}")
        return None

async def process_event_background(ticker: str, event_data: dict):
    """
    background task to research and cache an event.
    """
    key = (ticker, event_data['date'])
    if key in SEARCHING_CACHE:
        print(f"skipping duplicate search for {ticker} on {event_data['date']}")
        return
        
    SEARCHING_CACHE.add(key)
    
    db = SessionLocal()
    try:
        print(f"🕵️ [WhyEngine] starting investigation for {ticker} on {event_data['date']}...")
        result = await research_event(ticker, event_data['date'])
        
        if result:
            # check if already inserted by another thread 
            exists = db.query(EventCache).filter(
                EventCache.ticker == ticker, 
                EventCache.date == event_data['date']
            ).first()
            
            if not exists:
                # cache it
                new_event = EventCache(
                    ticker=ticker,
                    date=event_data['date'],
                    title=result['title'],
                    reason=result['reason'],
                    source_url=result['source'],
                    price_change=event_data['change']
                )
                db.add(new_event)
                db.commit()
                print(f"✅ [WhyEngine] found reason for {ticker} on {event_data['date']}: {result['title']}")
            else:
                 print(f"⚠️ [WhyEngine] reason already cached for {ticker} on {event_data['date']}")

        else:
            print(f"❌ [WhyEngine] failed to find reason for {ticker} on {event_data['date']}")
    except Exception as e:
        print(f"background task error: {e}")
    finally:
        if key in SEARCHING_CACHE:
            SEARCHING_CACHE.remove(key)
        db.close()
