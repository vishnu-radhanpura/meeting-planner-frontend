# Meeting Planner Frontend Startup Guide

## 1. Pull the latest code from GitHub

```bash
git pull origin main
```

> Replace `main` with your branch name if needed.

## 2. Install dependencies

From the repository root:

```bash
npm install
```

## 3. Run locally in development mode

Start the Angular dev server:

```bash
npm start
```

Open in your browser:

```text
http://localhost:4200
```

The app will reload automatically when you edit source files.

## 4. Change the backend URL

The frontend loads backend configuration at runtime from `public/config.json`.

Example:

```json
{
  "apiBaseUrl": "http://localhost:8080/meeting-planner"
}
```

Update `public/config.json` to point to your backend, then restart the app or rebuild the image.

## 5. Build for production

```bash
npm run build
```

The production build output is written to:

```text
dist/meeting-planner-frontend/browser
```

## 6. Run with Docker

Build the Docker image:

```bash
docker build -t meeting-planner-frontend .
```

Run the container on port 4200:

```bash
docker run --rm -p 4200:80 meeting-planner-frontend
```

Open in your browser:

```text
http://localhost:4200
```

## 7. Change backend URL for Docker

If you want the container to use a different backend URL, update `public/config.json` before building.


## 8. Notes

- The Angular app itself runs on `http://localhost:4200`.
- The backend URL is not hard-coded in the app; it is read from `config.json` at startup.
- Nginx is configured to serve the Angular SPA and to avoid caching `config.json`.
