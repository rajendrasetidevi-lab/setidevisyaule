# Setidevi School Result Processing App (HTML/CSS/JavaScript)

A responsive, browser-based starting application based on the `First Terminal Examination 2083.xlsx` workflow for Shree Setidevi Secondary School.

## Files

- `index.html` — app shell and script loading
- `style.css` — responsive desktop/mobile UI and print styling
- `app.js` — navigation, student management, workbook scan/import, marks entry, ledgers, draft gradesheets, analysis, settings, backups and CSV exports

## Run locally

1. Keep the three files in the same folder.
2. Open the folder in VS Code and launch `index.html` with the Live Server extension, or run a small local web server from this folder:

   ```bash
   python -m http.server 8000
   ```

3. Open `http://localhost:8000` in your browser.
4. Go to **Import / Export**, choose `First Terminal Examination 2083.xlsx`, review the worksheet preview and warnings, then select **Confirm and import**.

The Excel parser (SheetJS) is loaded from a CDN, so Excel import needs an internet connection. The rest of the UI and local browser storage do not need a server backend. If you need a fully offline setup, put an approved local copy of `xlsx.full.min.js` in the same folder and change the script reference in `index.html` to that local file.

## Current capabilities

- Mobile-friendly dashboard and class navigation for ECD, KG A/B, classes 1–3, separate 4A/4B, classes 5–12
- Workbook worksheet inventory with visible/hidden tabs, ranges, formula counts and cached-error counts
- Preview-before-commit workbook import from class mark sheets
- Import protections: Excel formula cells and error cells in score columns are not brought in as literal marks; warnings are added to the audit view
- Student list, add/edit/remove student
- Marks entry by class, subject and component; zero and blank are treated differently; configured full-mark bounds are checked
- Mark ledger, draft grade ledger, student gradesheet preview, coverage/result analysis
- Subject component full-mark/pass-mark settings, configurable grade thresholds per class (blank until approved)
- CSV exports, complete JSON backup/restore, browser-local persistence, print layout

## Important limitations — not production-ready yet

- **Data storage is local to one browser profile.** It is not shared between staff devices and is not backed by a central database.
- There is no authentication, server-side role permissions, multi-user concurrency, server backup, approval/locking workflow, or secure student portal.
- Excel import maps the 16 class mark sheets using their common header layout. Unusual or unrecognized fields should be reviewed against the sheet inventory before committing.
- Student records are imported primarily from the class mark-entry sheets and enriched from matching student-detail sheets where a reliable match is found (such as symbol/registration number, date of birth, gender, address, parent and contact fields). Review unmatched or ambiguous records against the original workbook before using them.
- Grading rules, pass/fail, GPA, rank, absent handling and optional-subject policies are **not assumed to be verified**. The source workbook audit reported broken defined names/references and cached formula errors. Configure only school-approved rules and independently test the outputs before publishing official results.
- This is a usable front-end starter, not a finished native Android/iOS application or a production School Management System backend.

## Safeguard

The app does not write changes back to the source workbook. Keep the original `First Terminal Examination 2083.xlsx` unchanged and export a JSON backup regularly.
