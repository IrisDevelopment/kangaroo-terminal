import asyncio
import json
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from scraper import ASXScraper

async def clean_price(price_str: str) -> float:
    """
    converts price to float
    for eg '$123.45' or '1,234' to 123.45
    """
    try:
        clean = price_str.replace('$', '').replace(',', '')
        return float(clean)
    except:
        return 0.0

async def update_database(data: list[dict]):
    db: Session = SessionLocal()
    try:
        print(f"[🦘] saving {len(data)} stocks to DB...")
        for item in data:
            # check if stock exists
            stock = db.query(models.Stock).filter(models.Stock.ticker == item['ticker']).first()
            
            p_val = await clean_price(item['price'])
            c_val = await clean_price(item['change_amount'])

            if not stock:
                # create new
                stock = models.Stock(
                    ticker=item['ticker'],
                    name=item['name'],
                    price=p_val,
                    change_amount=c_val,
                    change_percent=item['change_percent'],
                    market_cap=item['market_cap'],
                    volume=item['volume']
                )
                db.add(stock)
            else:
                # update existing
                stock.price = p_val
                stock.change_amount = c_val
                stock.change_percent = item['change_percent']
                stock.market_cap = item['market_cap']
                stock.volume = item['volume']
                stock.last_updated = models.datetime.utcnow()
        
        db.commit()
    except Exception as e:
        print(f"db error: {e}")
    finally:
        db.close()

async def run_market_engine():
    """main loop"""
    scraper = ASXScraper()
    await scraper.start()
    
    previous_snapshot = ""
    
    try:
        while True:
            # 1. get the current state of the table
            data = await scraper.get_current_data()
            
            if data:
                # 2. serialise to string to compare easily
                current_snapshot = json.dumps(data, sort_keys=True)
                
                # 3. ONLY SAVE IF somethpchanged
                if current_snapshot != previous_snapshot:
                    print(f"[🦘] price update detected! writing to DB...")
                    await update_database(data)
                    previous_snapshot = current_snapshot
                else:
                    # print a dot so yk it's alive
                    print(".", end="", flush=True)

            # 4. wait 1s (Fast enough for humans, slow enough for CPUs)
            # SELF REMINDER whilst testing - market closes at 4PM so don't get confused if it doesn't move LOL
            await asyncio.sleep(1)
            
    except Exception as e:
        print(f"engine crash: {e}")
    finally:
        await scraper.stop()