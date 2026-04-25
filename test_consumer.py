
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
