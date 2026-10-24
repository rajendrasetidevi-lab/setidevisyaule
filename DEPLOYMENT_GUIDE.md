# Website setup and deployment guide

## Files in this project

- `index.html` — web page shell
- `style.css` — layout and styling
- `app.js` — app behavior and Excel import logic
- `README.md` — features and limitations
- `START_HERE.txt` — quick start steps

Keep the three main files (`index.html`, `style.css`, `app.js`) in the same folder.

## Run on your computer

1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Open a terminal in that folder and run:

   ```bash
   python -m http.server 8000
   ```

4. Open `http://localhost:8000` in your browser.
5. Go to **Import / Export**, upload `First Terminal Examination 2083.xlsx`, review the preview and issues, and only then confirm import.

You can also use VS Code Live Server. Do not open `app.js` by itself; open `index.html` through a local web server.

## Publish as a static website

Upload the extracted project folder to a static website host such as Netlify, Cloudflare Pages or GitHub Pages. The site entry point is `index.html`; no build command is required. Excel import depends on the SheetJS library being loaded from jsDelivr, so the hosted website needs internet access for Excel import.

For Netlify, you can drag the extracted project folder into the site's manual deploy area. For GitHub Pages, commit the files to a repository and enable Pages for the chosen branch/folder.

## Before using official school results

This is a front-end prototype. Data is stored in the current browser only. It has no login, shared database, staff roles, server backups, or cross-device synchronization. It does not modify the uploaded source workbook. Audit the import mapping and configure full marks, pass marks, grading rules, absent handling and other school-approved policies; test with known sample results before publishing official grades.

Student information is sensitive. Do not publish a real workbook, student export, backup JSON, or any file containing student data in a public repository or public website. This project ZIP contains source code only, not the examination workbook.
