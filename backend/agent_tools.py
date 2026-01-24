import os
os.environ["ANONYMIZED_TELEMETRY"] = "false"

import yfinance as yf # type: ignore
from datetime import datetime
import pytz
import asyncio
from dotenv import load_dotenv
from browser_use import Agent, Browser, ChatOpenAI # type: ignore
from stream_utils import emit_browser_update, capture_browser_logs, stop_capturing_logs, emit_browser_screenshot, emit_ui_event, monitor_file_changes

load_dotenv()
HACKCLUB_KEY = os.getenv("HACKCLUB_API_KEY")

def get_current_time():
    tz = pytz.timezone('Australia/Sydney')
    return datetime.now(tz).strftime('%A, %Y-%m-%d %H:%M:%S %Z')

async def browser_monitor(browser: Browser):
    """
    background task to stream screenshots from browser
    """
    while True:
        try:
            screenshot = await browser.take_screenshot(format='jpeg', quality=50)
            if screenshot:
                await emit_browser_screenshot(screenshot)
            
            await asyncio.sleep(0.5) # update every 500ms
        except Exception as e:
            print(f"Monitor error: {e}")
            await asyncio.sleep(1)

# market tools
async def get_stock_price(ticker: str):
    try:
        sym = f"{ticker.upper()}.AX" if not ticker.upper().endswith(".AX") else ticker.upper()
        stock = yf.Ticker(sym).fast_info
        return {"price": stock.last_price, "change": ((stock.last_price - stock.previous_close)/stock.previous_close)*100}
    except Exception as e: return f"Error: {e}"

async def get_company_info(ticker: str):
    try:
        sym = f"{ticker.upper()}.AX"
        info = yf.Ticker(sym).info
        return {"description": info.get('longBusinessSummary','N/A')[:500]+"...", "sector": info.get('sector','N/A')}
    except Exception as e: return f"Error: {e}"

async def get_financials(ticker: str):
    try:
        sym = f"{ticker.upper()}.AX"
        stock = yf.Ticker(sym)
        fin = stock.income_stmt
        if fin.empty: return "No data"
        recent = fin.iloc[:, 0]
        return {"Revenue": recent.get("Total Revenue"), "Net Income": recent.get("Net Income")}
    except Exception as e: return f"Error: {e}"

# browser agent
async def browse_web(task: str):
    """
    starts a headless browser agent to perform the given task
    """
    if not HACKCLUB_KEY: return "Error: HACKCLUB_API_KEY not set."

    llm = ChatOpenAI(
        base_url="https://ai.hackclub.com/proxy/v1",
        api_key=HACKCLUB_KEY,
        model="google/gemini-3-flash-preview" # flash better for this usecase (much faster)
    )

    browser = Browser(
        headless=True,
        disable_security=True,
        # args to avoid bot/captcha detection:
        args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled", "--disable-infobars", "--window-size=1920,1080", "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"]
    )
    
    log_handler = capture_browser_logs()
    
    monitor_task = asyncio.create_task(browser_monitor(browser))
    
    # find where todo.md is located
    # *probably should remove this but while testing todo.md somehow kept moving locations so i did this bs 💔
    current_dir = os.getcwd()
    current_work_dir = os.path.abspath(".")

    possible_paths = [
        os.path.join(current_dir, "todo.md"),
        os.path.join(os.path.dirname(current_dir), "todo.md"),
        os.path.abspath("todo.md"),
        os.path.join(current_work_dir, "browseruse_agent_data", "todo.md"),
        os.path.join(current_dir, "browseruse_agent_data", "todo.md")
    ]
    unique_paths = list(set(possible_paths))
    
    monitor_tasks = []
    for p in unique_paths:
        await emit_browser_update(f"🔍 Monitoring Mission Plan at: {p}")
        monitor_tasks.append(asyncio.create_task(monitor_file_changes(p)))

    # force agent to work in the current directory
    current_work_dir = os.path.abspath(".")
    
    try:
        await emit_browser_update(f"🌐 Initializing Browser for: {task}")
        await emit_ui_event("browser_visibility", {"visible": True})
        
        agent = Agent(
            task=task,
            llm=llm,
            browser=browser,
            use_vision=True,
            file_system_path=current_work_dir 
        )
                
        history = await agent.run(max_steps=15)
        
        result = history.final_result()
        urls = history.urls()
        
        return f"BROWSER RESULT:\n{result}\n\nSOURCES VISITED:\n" + "\n".join(urls)
        
    except Exception as e:
        await emit_browser_update(f"❌ Browser Error: {e}")
        return f"Browser Error: {e}"
    finally:
        # cleanup
        await emit_ui_event("browser_visibility", {"visible": False})
        
        monitor_task.cancel()
        for t in monitor_tasks: t.cancel()
        
        try:
            await monitor_task
            await asyncio.gather(*monitor_tasks)
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
            
        stop_capturing_logs(log_handler)
        try:
            await browser.stop()
        except:
            pass

AVAILABLE_TOOLS = {
    "get_stock_price": get_stock_price,
    "get_company_info": get_company_info,
    "get_financials": get_financials,
    "browse_web": browse_web 
}