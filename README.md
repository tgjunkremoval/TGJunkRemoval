# TGJunkRemoval Website

A mobile-first HTML/CSS/JavaScript website with a Google Apps Script quote backend.

## Files

- `index.html` — website content and layout
- `styles.css` — responsive design
- `script.js` — navigation, photo previews/compression, quote submission
- `google-apps-script/Code.gs` — Google Apps Script backend
- `assets/logo-placeholder.svg` — temporary header logo
- `assets/logo-placeholder-light.svg` — temporary footer logo

## 1. Logo

The supplied TG Junk Removal logo has already been installed at:

`assets/tg-junk-removal-logo.jpg`

The website color palette has also been adjusted to match the black, green and white branding.

## 2. Update contact information

Search `index.html` for:

- `(000) 000-0000`
- `+10000000000`
- `quotes@tgjunkremoval.com`
- `Your Service Area`

Replace them with the real business information.

## 3. Set up the Google Apps Script quote receiver

1. Go to Google Apps Script and create a new project.
2. Delete the default code and paste the contents of `google-apps-script/Code.gs`.
3. Change:
   `const BUSINESS_EMAIL = "YOUR_EMAIL@example.com";`
   to the email that should receive quote PDFs.
4. Optional: create a Google Drive folder for quote copies. Copy its folder ID and set `DRIVE_FOLDER_ID`. Leave it blank if you only need email.
5. In Apps Script, set the project's time zone to your business time zone.
6. Click **Deploy → New deployment → Web app**.
7. Execute as: **Me**
8. Who has access: **Anyone**
9. Authorize the script.
10. Copy the deployed Web App URL ending in `/exec`.
11. Open `script.js` and replace:
   `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`
   with that `/exec` URL.

Important: if you later change `Code.gs`, create/update the Web App deployment so the live version receives the new code.

## 4. Test

Open the website over HTTPS (Netlify, Vercel, GitHub Pages, cPanel, etc.).

Submit:
- customer name
- phone
- email
- address
- job description
- 1–4 photos

The browser compresses photos before sending them. Apps Script creates a PDF containing the request and images, then emails the PDF to your configured business email.

## 5. Hosting

This front-end is static, so it can be hosted almost anywhere:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages
- traditional cPanel/shared hosting

The form backend stays on Google Apps Script.

## Before going live

Add your real:
- logo
- phone
- email
- service area
- business hours if desired
- Privacy Policy / Terms pages if your business needs them
- Google Analytics / Meta Pixel only if you want tracking and have an appropriate privacy disclosure

Also test the quote form from both iPhone and Android before publishing.


## Current brand logo

The exact combined TG Junk Removal logo supplied by the owner is installed at:

`assets/tg-junk-removal-header-logo.png`

It is used in both the header and footer, with responsive sizing for desktop and mobile.
