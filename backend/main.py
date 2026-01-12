import yfinance as yf

def get_stock_price(ticker: str):
    # .AX for Australian stocks
    stock = yf.Ticker(f"{ticker}.AX")

    info = stock.fast_info
    
    return {
        "symbol": ticker,
        "price": info.last_price,
        "currency": info.currency
    }

# test
if __name__ == "__main__":
    print(get_stock_price("BHP"))
    print(get_stock_price("CBA"))