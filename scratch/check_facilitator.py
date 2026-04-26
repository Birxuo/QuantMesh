import asyncio
import os
from x402.http import HTTPFacilitatorClient, FacilitatorConfig
from dotenv import load_dotenv

load_dotenv()

async def check_facilitator():
    url = os.getenv("FACILITATOR_URL", "https://x402.org/facilitator")
    print(f"Checking facilitator at: {url}")
    
    client = HTTPFacilitatorClient(FacilitatorConfig(url=url))
    try:
        # x402 2.8.0 uses get_supported() which is sync but might trigger internal async fetch if not careful?
        # Wait, the protocol says it's sync in the base class but the implementation might be different.
        supported = client.get_supported()
        print("Supported networks/schemes:")
        for kind in supported.kinds:
            print(f"  - Version: {kind.x402_version}, Network: {kind.network}, Scheme: {kind.scheme}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_facilitator())
