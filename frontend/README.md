# Mini Wallet React Frontend

React UI for the Sails Mini Wallet API.

## Run locally

From the project root:

```bash
npm install
npm --prefix frontend install
node app.js --port 1337
npm run frontend:dev
```

Open `http://127.0.0.1:5173`.

The Vite dev server proxies `/api/*` to `http://127.0.0.1:1337`, so the React app can call the Sails API without extra CORS setup.
