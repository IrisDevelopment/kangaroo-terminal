from contextvars import ContextVar
import asyncio
import logging
import re
import base64
import os

stream_queue_var = ContextVar("stream_queue", default=None)

def set_stream_queue(queue: asyncio.Queue):
    return stream_queue_var.set(queue)

async def emit_browser_update(text: str):
    """emits a browser action log to the frontend"""
    queue = stream_queue_var.get()
    if queue:
        await queue.put({"type": "browser_action", "content": text})

async def emit_browser_screenshot(screenshot_binary):
    """emits a browser screenshot to the frontend"""
    queue = stream_queue_var.get()
    if queue:
        # Convert bytes to base64 string
        b64_img = base64.b64encode(screenshot_binary).decode('utf-8')
        await queue.put({"type": "browser_screenshot", "content": b64_img})

async def emit_agent_state(state_data):
    """emits structured agent state (memory, next goal)"""
    queue = stream_queue_var.get()
    if queue:
        await queue.put({"type": "agent_state", "content": state_data})

async def monitor_file_changes(filepath: str, interval: float = 1.0):
    """
    monitors browse-use todo file for changes and emits updates to the frontend
    """
    last_content = None
    queue = stream_queue_var.get()
    
    # print(f"[DEBUG] Monitoring {filepath} for changes. Queue: {queue}")
    
    while True:
        try:
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                if content != last_content:
                    print(f"[DEBUG] File {filepath} changed. Emitting update.")
                    last_content = content
                    if queue:

                        target_name = "todo.md" if "todo.md" in filepath else os.path.basename(filepath)
                        await queue.put({"type": "file_update", "filename": target_name, "content": content})
            else:
                pass 
        except Exception as e:
            print(f"[DEBUG] Error monitoring {filepath}: {e}")
            pass
            
        await asyncio.sleep(interval)

async def emit_ui_event(event_type: str, data: dict):
    """emits a ui event to the frontend"""
    queue = stream_queue_var.get()
    if queue:
        await queue.put({"type": event_type, **data})

# push logs to frontend
class FrontendLogHandler(logging.Handler):
    """
    intercepts logs, strips ANSI codes, and sends to frontend.
    """
    def emit(self, record):
        try:
            msg = self.format(record)

            # strip ansi escape codes
            ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
            clean_msg = ansi_escape.sub('', msg)

            if not clean_msg.strip():
                return

            queue = stream_queue_var.get()

            # clean up log message prefix
            if "[Agent]" in clean_msg: clean_msg = clean_msg.split("[Agent]")[1].strip()
            if "[tools]" in clean_msg: clean_msg = clean_msg.split("[tools]")[1].strip()
            if "[BrowserSession]" in clean_msg: clean_msg = clean_msg.split("[BrowserSession]")[1].strip()

            if "File location:" in clean_msg and "todo.md" in clean_msg:
                try:
                    path_match = re.search(r"File location: (.+todo\.md)", clean_msg)
                    if path_match:
                        file_path = path_match.group(1).strip()
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        
                        # file update event
                        if queue:
                             try:
                                loop = asyncio.get_running_loop()
                                if loop.is_running():
                                    loop.create_task(queue.put({"type": "file_update", "filename": "todo.md", "content": content}))
                             except RuntimeError:
                                pass
                except Exception as e:
                    # fallback: just let the log go through, maybe append error
                    clean_msg += f" [Error reading file: {e}]"

            if queue:
                try:
                    loop = asyncio.get_running_loop()
                    if loop.is_running():
                        loop.create_task(queue.put({"type": "browser_action", "content": clean_msg}))
                except RuntimeError:
                    pass # loop might be closed
        except Exception:
            self.handleError(record)

def capture_browser_logs():
    """Attaches our handler to the browser_use logger"""
    logger = logging.getLogger("browser_use")
    handler = FrontendLogHandler()    
    handler.setFormatter(logging.Formatter('%(message)s'))
    logger.addHandler(handler)
    return handler

def stop_capturing_logs(handler):
    """Clean up to prevent memory leaks"""
    logger = logging.getLogger("browser_use")
    logger.removeHandler(handler)

