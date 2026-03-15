# Capture (ADHD-Friendly Post-It Board)

A simple **client-side** React app (via CDN + Babel) that stores notes in **localStorage**.

## Features

- Four categories: **Unsorted**, **Now**, **Later**, **Never (Trash)**
- Drag-and-drop notes between categories
- Double-click to edit a note
- Notes persist in the browser (no backend)
- Pastel post-it aesthetic with hand-written font

## Run locally

Open `index.html` in your browser.

> Tip: For a quicker local experience, serve it from a local dev server (e.g., `python -m http.server` from within this folder).

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In the repository settings, enable GitHub Pages and set the source to the `main` branch (root).
3. Your app will be available at `https://<your-username>.github.io/<repo-name>/`.


## Notes

- All notes are stored locally; clearing browser storage will remove them.
- The **Never** column acts as a trash bin; press the **Clear Never (Trash)** button to remove everything in that category.
