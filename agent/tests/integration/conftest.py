import pytest
import time

@pytest.fixture(autouse=True)
def rate_limit_cooldown():
    # Sleep 6.5 seconds before/after every integration test to limit rate to under 10 requests per minute
    yield
    time.sleep(6.5)
