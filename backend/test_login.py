import requests

# Login
login_url = "http://127.0.0.1:8000/login"
login_data = {
    "email": "admin@kiet.edu",
    "password": "admin"
}
response = requests.post(login_url, json=login_data)
if response.status_code != 200:
    print(f"Login Failed: {response.text}")
    exit(1)

token = response.json().get("access_token")
print(f"Token: {token}")

# Fetch Profile
profile_url = "http://127.0.0.1:8000/users/me"
headers = {
    "Authorization": f"Bearer {token}"
}
profile_res = requests.get(profile_url, headers=headers)
print(f"Profile Status: {profile_res.status_code}")
print(f"Profile Data: {profile_res.text}")
