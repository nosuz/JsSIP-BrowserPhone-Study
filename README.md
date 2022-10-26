# Authentification

Asterisk has its HTTP server. But its server exposes paths not only WebSocket but also status. So, I wanted to open HTTP ports for only limited persons and have introduced another authentification system.

If you don't want to use this authentification system, please set false for "firewall" in config.json file.

# Dialpad

DELETE key will clear the phone number field.
To remove the last number from the phone number field, use BACKSPAE key.
Ctrl+V will paste the phone number from clipboard.

To answer call, hit "Enter" while ringing. If you hit the DELETE key while ringing, the incoming call is refused.
