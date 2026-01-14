from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
from ingestor import run_market_engine, is_market_open
import models
import asyncio
import yfinance as yf
from contextlib import asynccontextmanager

# create tables upon startup
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # start the scraper in the background
    print("[🦘] kangaroo engine starting...")
    scraper_task = asyncio.create_task(run_market_engine())
    
    yield  # runs here
    
    # ensure shutdown - scraper prkoperly cancelled upon ctrl+c press
    print("[🦘] kangaroo engine shutting down...")
    scraper_task.cancel()
    try:
        await scraper_task
    except asyncio.CancelledError:
        pass # cancelled successfully

app = FastAPI(lifespan=lifespan)

# cors - allows Next.js frontend to talk to backend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "kangaroo engine running"}

@app.get("/market-status")
def get_market_status():
    """returns whether the asx is currently open"""
    return {"is_open": is_market_open()}

@app.get("/market-index") # this price might be delayed, check later if yf is fine as well as the difference between index v futures pricing
def get_market_index():
    try:
        # AXJO is the symbol for S&P/ASX200
        ticker = yf.Ticker("^AXJO")

        info = ticker.fast_info

        price = info.last_price
        prev_close = info.previous_close

        change_amount = price - prev_close
        change_percent = (change_amount / prev_close) * 100

        return {
            "symbol": "ASX 200",
            "price": price,
            "change": change_amount,
            "percent": change_percent
        }
    except Exception as e:
        print(f"Error fetching market index (ASX 200): {e}")
        return {"error": "Unavailable"}


@app.get("/stocks")
def get_stocks(db: Session = Depends(get_db)):
    # returns stocks sorted by market cap (biggest first)
    return db.query(models.Stock).order_by(models.Stock.market_cap.desc()).all()

@app.get("/stock/{ticker}")
def get_stock(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock