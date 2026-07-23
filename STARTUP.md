# Meeting Planner Frontend Startup Guide

## 1. Pull the latest code from GitHub

```bash
git pull origin main
```

> Replace `main` with your branch name if needed.


## 2. Run with Docker

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

## 3. Change backend URL for Docker

If you want the container to use a different backend URL, update `public/config.json` before building.


## 4. Notes

- The Angular app itself runs on `http://localhost:4200`.
- The backend URL is not hard-coded in the app; it is read from `config.json` at startup.
- Nginx is configured to serve the Angular SPA and to avoid caching `config.json`.
