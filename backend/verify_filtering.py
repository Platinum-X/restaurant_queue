import requests
import datetime

BASE_URL = "http://localhost:8000/api"

# 1. Create a venue
venue_name = f"Test Venue {datetime.datetime.now().isoformat()}"
r = requests.post(f"{BASE_URL}/venues/", json={"name": venue_name})
if r.status_code != 200:
    print(f"Failed to create venue: {r.text}")
    exit(1)
venue_id = r.json()["id"]
print(f"Created venue {venue_id}")

# 2. Create guests with different statuses
statuses = ["WAITING", "SEATED", "COMPLETED", "CANCELLED"]
guest_ids = {}

for status in statuses:
    r = requests.post(f"{BASE_URL}/guests/", json={
        "name": f"Guest {status}",
        "party_size": 2,
        "venue_id": venue_id,
        "status": status if status != "SEATED" else "WAITING" # Create as WAITING first
    })
    guest = r.json()
    guest_ids[status] = guest["id"]
    
    if status != "WAITING":
        # Update status
        requests.put(f"{BASE_URL}/guests/{guest['id']}/status", json={"status": status})

print("Created guests with different statuses")

# 3. Test Active Guests Filter
print("\nTesting Active Guests Filter (WAITING, SEATED)...")
r = requests.get(f"{BASE_URL}/venues/{venue_id}/guests", params=[
    ("status", "WAITING"),
    ("status", "SEATED")
])
guests = r.json()
statuses_found = [g["status"] for g in guests]
print(f"Found statuses: {statuses_found}")

if "WAITING" in statuses_found and "SEATED" in statuses_found and "COMPLETED" not in statuses_found:
    print("PASS: Active filtering works")
else:
    print("FAIL: Active filtering incorrect")

# 4. Test Past Guests Filter (Date + Status)
print("\nTesting Past Guests Filter (COMPLETED + Today)...")
today = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
r = requests.get(f"{BASE_URL}/venues/{venue_id}/guests", params=[
    ("status", "COMPLETED"),
    ("status", "CANCELLED"),
    ("created_after", today)
])
if r.status_code != 200:
    print(f"Error {r.status_code}: {r.text}")
    print(r.url)
    exit(1)
guests = r.json()
statuses_found = [g["status"] for g in guests]
print(f"Found statuses: {statuses_found}")

if "COMPLETED" in statuses_found and "CANCELLED" in statuses_found and "WAITING" not in statuses_found:
    print("PASS: Past filtering works")
else:
    print("FAIL: Past filtering incorrect")
