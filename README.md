# Authentification

Asterisk has its HTTP server. But its server exposes paths not only WebSocket but also status. So, I wanted to open HTTP ports for only limited persons and have introduced another authentification system.

If you don't want to use this authentification system, please set false for "firewall" in config.json file.
