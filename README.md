# Joy Personal Portfolio — Firestore + Cloudinary

This version uses:
- GitHub Pages = website hosting
- Firebase Authentication = private admin login
- Firestore = portfolio text/data
- Cloudinary = image hosting/uploads
- Firebase Storage = NOT USED

## One-time setup

### 1) Firebase
Create a Firebase project and Web App.

Enable:
- Authentication → Email/Password
- Firestore Database

Create your admin user under Authentication → Users.

The provided `firebase-config.js` is already filled with your Firebase Web App configuration.

Deploy the included Firestore rules:
- `firestore.rules`

### 2) Cloudinary
Create a Cloudinary account.

Go to Settings → Upload → Upload Presets → Add upload preset.

For this GitHub Pages version, choose **Unsigned**.

Recommended restrictions:
- Images only (JPG, PNG, WEBP)
- Maximum file size around 8 MB or lower
- Disable public ID supplied by users
- Use a dedicated portfolio folder/prefix if available

Copy:
- Cloud name
- Upload preset name

into `cloudinary-config.js`.

IMPORTANT: Never put a Cloudinary API Secret in this project.

Cloudinary unsigned presets are intentionally usable from browser code, but the preset name is discoverable. Therefore keep the preset tightly restricted to images and a reasonable size limit. For stronger upload protection, use signed uploads through a backend/Cloud Function later.

### 3) GitHub Pages
Upload the CONTENTS of this folder to the repository root, then enable:
Settings → Pages → Deploy from branch → main → / (root).

## Daily use

Open the website → Admin → Login → edit content → upload images → Save all changes.

You no longer need to upload each new image to GitHub manually.

## Security model

The public website can read the portfolio document.
Only authenticated Firebase users can write the portfolio document.

Cloudinary image uploads use a restricted unsigned preset because this site is hosted as static GitHub Pages. Do not store private API secrets in frontend files.


## Admin security

The editor is restricted to this Firebase Authentication UID:

`X8IuyH0h6nSUqn7066tGQKodEWV2`

The Firestore rules also enforce the same UID server-side. So changing the JavaScript in the browser cannot bypass the Firestore write restriction. Firebase Security Rules evaluate `request.auth.uid` on the server.

Important: a Firebase UID is an identifier, not a password. Keep the Admin account password, recovery email, and other credentials private. If that Admin account is compromised, an attacker could legitimately authenticate as that account; use a strong unique password and enable appropriate account security.
