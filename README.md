# Joy — Personal Portfolio

A fast, responsive, static personal portfolio designed for GitHub Pages.

## Files

- `index.html` — page structure
- `style.css` — responsive UI/theme
- `app.js` — interactions, filtering, editor, dark mode
- `data.js` — the main content you should edit for permanent GitHub Pages changes
- `assets/` — profile, project and certificate images

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files and folders while keeping the same structure.
3. Make sure `index.html` is in the repository root.
4. Go to **Settings → Pages**.
5. Under **Build and deployment**, select **Deploy from a branch**.
6. Select your main branch and `/ (root)`.
7. Save and wait for GitHub Pages to publish.

## Add your own images

Put your image files inside `assets/`, then change the paths in `data.js`.

Example:

```js
profileImage: "assets/joy.jpg"
```

Project images:

```js
image: "assets/my-project.jpg"
```

## Editing from the website

The floating **Edit** button opens a browser-only editor. It saves changes to `localStorage` on that device/browser.

For changes that must appear publicly for everyone on GitHub Pages, edit `data.js`, commit, and push to GitHub.

The **Export data** button can generate a new `data.js` from your current browser edits. Replace the repository's `data.js` with that exported file and push it to GitHub.

## Important

This is intentionally a static GitHub Pages site. A public website cannot safely write directly to your GitHub repository without a backend/authentication system. Do not put a GitHub personal access token inside client-side JavaScript.
