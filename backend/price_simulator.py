import asyncio
import random
from datetime import datetime
from database import SessionLocal
import models

# how often to tick (seconds)
TICK_INTERVAL = 2

# price movement range per tick
MIN_MOVE_PCT = 0.002   # 0.2%
MAX_MOVE_PCT = 0.012   # 1.2%

# what fraction of stocks move each tick (30-60%)
MIN_MOVE_RATIO = 0.3
MAX_MOVE_RATIO = 0.6


async def run_price_simulator():
    """
    background loop that nudges stock prices 
    only runs in display mode
    """
    print("[🎭] price simulator starting...")

    while True:
        try:
            db = SessionLocal()
            try:
                stocks = db.query(models.Stock).all()
                if not stocks:
                    await asyncio.sleep(10)
                    continue

                # random subset 
                move_count = max(1, int(len(stocks) * random.uniform(MIN_MOVE_RATIO, MAX_MOVE_RATIO)))
                movers = random.sample(stocks, min(move_count, len(stocks)))

                for stock in movers:
                    if not stock.price or stock.price <= 0:
                        continue

                    # random direction
                    direction = random.choice([-1, 1])
                    magnitude = random.uniform(MIN_MOVE_PCT, MAX_MOVE_PCT)
                    move = stock.price * magnitude * direction

                    new_price = round(stock.price + move, 4)
                    if new_price <= 0:
                        new_price = stock.price  

                    change = new_price - (stock.price - (stock.change_amount or 0))
                    change_pct = (change / (new_price - change)) * 100 if (new_price - change) != 0 else 0

                    stock.price = new_price
                    stock.change_amount = round(change, 4)
                    stock.change_percent = f"{'+' if change_pct >= 0 else ''}{change_pct:.2f}%"
                    stock.last_updated = datetime.now()

                db.commit()
            finally:
                db.close()

            await asyncio.sleep(TICK_INTERVAL)

        except Exception as e:
            print(f"[🎭] simulator error: {e}")
            await asyncio.sleep(TICK_INTERVAL)
