# Nyarch local — run instructions

This branch adds a lightweight local backend and a simple Utsuwa-like web UI that uses Nyarch as the assistant brain.

Quick start (Linux, Docker recommended)

1) Copy .env.example to .env and edit if you will connect to a real Nyarch endpoint:

   cp .env.example .env
   # edit NYARCH_URL in .env if you have a Nyarch-compatible HTTP endpoint

2) With Docker (recommended):
   docker-compose up --build
   # open http://localhost:3000 in your browser

3) Without Docker (native):
   cd server
   npm ci
   NYARCH_URL=http://localhost:1337/v1/chat/completions node index.js
   # open http://localhost:3000

Notes and safety
- By default, if NYARCH_URL is not set the server uses a local mock of Nyarch. This keeps everything local and safe.
- The server binds to 127.0.0.1 by default. If you need remote access, change HOST and secure it.
- Do NOT commit any secrets. Use .env for local configuration.

Files added
- server/ - small Express backend
- web/ - static frontend (index.html, app.js, styles.css)
- Dockerfile, docker-compose.yml, .env.example

If you want me to: enable streaming, wire a real Nyarch container, or convert this to an Electron app, say so and I will continue.
