import asyncio
from provider.main import app
import uvicorn
import threading

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8001)

threading.Thread(target=run_server, daemon=True).start()

import time
time.sleep(2)

import subprocess
import sys
# Run consumer exactly once
with open("test_consumer.py", "w") as f:
    f.write("""
import asyncio
from consumer.agent import run_agent, PROVIDER_URL
# change url to 8001
import consumer.agent
consumer.agent.PROVIDER_URL = "http://127.0.0.1:8001"
# run just one iteration
async def test():
    try:
        await asyncio.wait_for(run_agent(), timeout=5)
    except asyncio.TimeoutError:
        pass
asyncio.run(test())
""")
proc = subprocess.run([sys.executable, "test_consumer.py"], capture_output=True, text=True)
print("CONSUMER STDOUT:", proc.stdout)
print("CONSUMER STDERR:", proc.stderr)
