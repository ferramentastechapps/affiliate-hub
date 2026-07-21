import json
data = {
    'access_token': 'APP_USR-4572794376119987-061215-00036508a6b1c785e59fd5643ea1aee5-1985590821',
    'refresh_token': 'TG-6a2c607f215d1d0001cfc1cc-1985590821',
    'client_id': '4572794376119987',
    'client_secret': 'U4ON3vGw1jM70iPhm8Z0CwhHM0borgl4'
}
with open('bot/ml_token.json', 'w') as f:
    json.dump(data, f)
print("Saved!")
