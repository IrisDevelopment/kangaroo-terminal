import yfinance as yf # type: ignore
import pandas as pd
import numpy as np
import asyncio
from concurrent.futures import ThreadPoolExecutor

# indicator calculations 
def calculate_indicators(ticker, hist):
    try:
        if hist.empty: return None
        
        # RSI
        delta = hist['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        hist['RSI'] = 100 - (100 / (1 + rs))
        
        # SMA
        hist['SMA_50'] = hist['Close'].rolling(window=50).mean()
        hist['SMA_200'] = hist['Close'].rolling(window=200).mean()
        
        # Bollinger Bands
        hist['SMA_20'] = hist['Close'].rolling(window=20).mean()
        std = hist['Close'].rolling(window=20).std()
        hist['BB_Upper'] = hist['SMA_20'] + (2 * std)
        hist['BB_Lower'] = hist['SMA_20'] - (2 * std)
        
        # replace 0 with a small number to avoid division by zero
        sma20_safe = hist['SMA_20'].replace(0, 0.01)
        hist['BB_Width'] = (hist['BB_Upper'] - hist['BB_Lower']) / sma20_safe

        # get latest row
        latest = hist.iloc[-1]
        prev = hist.iloc[-2]
        
        signals = []
        
        # if rsi is nan (not enough data), set it to 50 (neutral)
        rsi_val = latest['RSI']
        if pd.isna(rsi_val):
            rsi_val = 50.0
        
        # strategy stuff

        # RSI OVERSOLD (Buy Dip)
        if rsi_val < 30:
            signals.append("RSI_OVERSOLD")
        elif rsi_val > 70:
            signals.append("RSI_OVERBOUGHT")
            
        # GOLDEN CROSS (Trend Start)
        if pd.notna(prev['SMA_50']) and pd.notna(prev['SMA_200']) and \
           pd.notna(latest['SMA_50']) and pd.notna(latest['SMA_200']):
            
            if prev['SMA_50'] < prev['SMA_200'] and latest['SMA_50'] > latest['SMA_200']:
                signals.append("GOLDEN_CROSS")
            elif prev['SMA_50'] > prev['SMA_200'] and latest['SMA_50'] < latest['SMA_200']:
                signals.append("DEATH_CROSS")
            
        # BOLLINGER SQUEEZE
        bb_width = latest['BB_Width']
        if pd.notna(bb_width) and bb_width < 0.10:
            signals.append("BB_SQUEEZE")

        # UNUSUAL VOLUME (Whale Alert)
        # 30d average volume
        if 'Volume' in hist.columns:
            avg_vol = hist['Volume'].rolling(window=30).mean().iloc[-1]
            cur_vol = hist['Volume'].iloc[-1]
            if pd.notna(avg_vol) and avg_vol > 0:
                # if volume is 3x the average
                if cur_vol > 3 * avg_vol:
                    signals.append("WHALE_ALERT")

        if not signals:
            return None
        
        # CONFLUENCE SCORE
        # calculate score based on signal strength
        score = 0
        if "RSI_OVERSOLD" in signals: score += 1
        if "RSI_OVERBOUGHT" in signals: score += 1
        if "GOLDEN_CROSS" in signals: score += 3 # very strong trend signal
        if "DEATH_CROSS" in signals: score += 3
        if "BB_SQUEEZE" in signals: score += 1
        if "WHALE_ALERT" in signals: score += 2 # strong institutional hint
            
        return {
            "ticker": ticker,
            "price": float(latest['Close']),
            "rsi": round(float(rsi_val), 2),
            "signals": signals,
            "score": score
        }
    except Exception as e:
        print(f"Calc error {ticker}: {e}")
        return None

def scan_market(tickers):
    """
    scans the given list of tickers for technical indicators
    """
    print(f"Scanning {len(tickers)} assets...")
    
    # bulk download data
    try:
        data = yf.download(tickers, period="1y", interval="1d", group_by='ticker', progress=False, threads=True)
    except Exception as e:
        print(f"Download failed: {e}")
        return []

    results = []
    
    # process each ticker
    for ticker in tickers:
        try:
            # handle multi-index dataframe from yfinance
            hist = data[ticker]
            # drop NaN rows to ensure calculations are valid
            hist = hist.dropna(subset=['Close'])
            
            if len(hist) < 200: continue # not enough data for SMA 200
            
            res = calculate_indicators(ticker.replace(".AX", ""), hist)
            if res:
                results.append(res)
        except Exception:
            continue
            
    return results