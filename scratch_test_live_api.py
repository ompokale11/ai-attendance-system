import urllib.request
import urllib.parse
import json

base_url = "https://ai-attendance-system-xwka.onrender.com"

print("--- Testing Login with default admin ---")
login_url = f"{base_url}/api/v1/auth/login"
data = urllib.parse.urlencode({
    "username": "admin",
    "password": "admin123"
}).encode("utf-8")

req = urllib.request.Request(
    login_url,
    data=data,
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)

try:
    with urllib.request.urlopen(req, timeout=30) as response:
        print("Login Status:", response.getcode())
        print("Login Body:", response.read().decode())
except Exception as e:
    print("Login Failed:")
    if hasattr(e, "read"):
        print("Body:", e.read().decode())
    else:
        print(e)

print("\n--- Testing Register with testuser ---")
register_url = f"{base_url}/api/v1/auth/register"
reg_data = json.dumps({
    "username": "testuser_unique_123",
    "password": "testpassword123"
}).encode("utf-8")

req_reg = urllib.request.Request(
    register_url,
    data=reg_data,
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req_reg, timeout=30) as response:
        print("Register Status:", response.getcode())
        print("Register Body:", response.read().decode())
except Exception as e:
    print("Register Failed:")
    if hasattr(e, "read"):
        print("Body:", e.read().decode())
    else:
        print(e)




