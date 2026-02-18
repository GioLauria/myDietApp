# My Diet App

## Automated Change Policy

- All changes applied to this project will include an update to this `README.md`.
- Every such change will be committed with a GPG-signed commit and pushed to the remote `origin` branch.

Recent automated fixes:

- 2026-02-18: Fixed compile errors in `src/app/components/meal-plan/meal-plan.ts` (restored missing signals/computed/ngOnInit) so the Angular build completes.
 - 2026-02-18: Fixed compile errors in `src/app/components/meal-plan/meal-plan.ts` (restored missing signals/computed/ngOnInit) so the Angular build completes.
 - 2026-02-18: Removed nested `server/server` folder as part of cleanup; backend files remain in `server/`.

A formal and professional web application for managing dieting, calories, weight, and meal planning.

## Key Features

- **Analytics** – Weekly analytics matrix built from the weight log. Shows averages for weight, body fat, lean mass, BMR, target kcal, macros, and FFMI. Workout/Phase can be configured per week, and the latest week is highlighted and editable.
- **Weight Log** – Log weight and optional body fat, edit entries inline, and visualise progress with gauges. Admin/Master users can generate realistic sample data or delete all logs; analytics are rebuilt automatically to match the logs.
- **Meal Plan** – View saved meals and a summary of the current analytics week (target kcal and macros). Generate a random daily meal plan (Breakfast, Snack 1, Lunch, Snack 2, Dinner, Snack 3) using foods from the Food DB, aiming to match calorie and macro targets within ~2% when possible.
- **Food DB** – Searchable food database organised by categories. Admin/Master users can maintain foods and categories.
- **Admin Tools** – API routes catalogue (with Postman export), DB relationships diagram (including an interactive draggable layout), and an Admin DB console for inspecting tables and running safe queries.
- **Personalisation** – Profile page with appearance options (colour scheme, font family, base font size) stored per user.

## Architecture & Tech Stack

- **Frontend**: Angular (standalone components), Angular Material, SCSS.
- **Backend**: Node.js, Express, SQLite via Sequelize.
- **Data model highlights**:
  - `tblProfile`, `tblUserType`, `tblFoodCategories`, `tblFood`, `tblWeight`.
  - `tblDietPhase` for per‑profile diet phase configuration.
  - `tblAnalytics` for weekly analytics including BMR, target kcal, macros, FFMI, and per‑user table width preference.

## Getting Started

1. Install root dependencies:
	- `npm install`
2. Install server dependencies:
	- `cd server`
	- `npm install`
3. Start both backend and frontend (from the project root):
	- On Windows: run `start-all.bat`
	- Or manually:
	  - `cd server && npm start` (API on `http://localhost:3000`)
	  - In another terminal, `npm start` (Angular app on `http://localhost:4200`)

## In‑App Documentation

- **User Manual** – Open the help icon in the top‑right corner of the app to see an overview of all screens and features.
- **Changelog** – Open the history icon in the top‑right corner or view [CHANGELOG.md](CHANGELOG.md) in the repository for a summary of recent changes.

## Development Notes

- This project was originally generated with the Angular CLI and then extended with a Node/Express/SQLite backend and additional tooling.

## Enforce Signed Commits (recommended)

This repository is configured to *prefer* GPG-signed commits locally. To make sure all commits pushed to the remote are signed, follow these steps.

1. Generate or import a GPG key and publish it to GitHub.

```bash
# Generate a new GPG key (interactive)
gpg --full-generate-key

# List keys and copy the key ID
gpg --list-secret-keys --keyid-format=long

# Tell git which key to use (replace <KEYID>)
git config --local user.signingkey <KEYID>

# Enable commit signing by default in this repo
git config --local commit.gpgsign true
git config --local tag.gpgSign true
```

2. Register your public key with GitHub (https://github.com/settings/keys) so GitHub can verify signed commits.

3. Optional: install a pre-push hook that verifies signatures before pushing.

Note: the repository's hook-install scripts were removed in a cleanup. If you want local verification, either create a `.git/hooks/pre-push` script that runs your preferred verification, or rely on GitHub branch protection to require signed commits centrally.

Example minimal pre-push hook (create `.git/hooks/pre-push` and make it executable):

```bash
#!/bin/sh
# Check for unsigned commits between remote HEAD and local HEAD
git fetch origin --quiet
git log origin/HEAD..HEAD --pretty=format:'%H %G?' | while read commit sig; do
	if [ "$sig" = "N" ]; then
		echo "Found unsigned commit $commit"; exit 1
	fi
done
```

4. If you want to require signed commits on GitHub, enable the "Require signed commits" branch protection rule in the repository settings for the protected branch (e.g. `master`).

Notes:
- Enabling `commit.gpgsign` locally will cause `git commit` to fail if your GPG key is not available or not configured. Follow the steps above to setup GPG and register the public key with GitHub.
- If you prefer an automated installer for hooks, re-add or recreate the `scripts/install-git-hooks.sh` helper in the project root.
