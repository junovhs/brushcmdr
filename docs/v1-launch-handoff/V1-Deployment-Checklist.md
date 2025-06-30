# **V1.0 Deployment Checklist: Brush Commander**

*Version: 1.0.0*
*Date: 2025-06-29*
*Status: Ready for Execution - **TARGET: vault.tiptopbrushes.com (Vercel Production)***

## **1.0 Introduction**

This checklist outlines the essential steps and verifications required for a successful, secure, and robust deployment of Brush Commander V1.0 to **vault.tiptopbrushes.com** (via Vercel). This marks the app's transition out of beta into its first official open release.

It also includes a separate, critical step for updating the **legacy GitHub Pages domain** to facilitate data migration for existing beta users.

## **2.0 Pre-Deployment Steps (Before Any Push)**

Before initiating deployment, confirm the following:

*   **[ ] Final Code Review:** All V1.0 features (Brush Inspector, Backup/Restore, Enhanced Export, Multi-Tag Filtering, corrected parsing) have been thoroughly tested locally on both desktop and iPad. No known regressions or critical bugs exist.
*   **[ ] `APP_VERSION` Update (js/config.js):**
    *   Verify `APP_VERSION` in `js/config.js` is set to `1.0.0`.
    *   Verify `DB_SCHEMA_VERSION` matches the current schema (`7`).
*   **[ ] `CACHE_NAME` Update (sw.js):**
    *   Ensure `CACHE_NAME` and `DYNAMIC_CACHE_NAME` in `sw.js` are incremented to `brush-commander-v1.0.6` (or next sequential version) to force Service Worker re-installation for all users.
    *   **Crucial for Existing Users:** This version bump ensures existing beta users (on GitHub Pages) will download the new Service Worker and updated app files upon their next visit, which is essential before they perform a backup.
*   **[ ] Environment Variables (Vercel):**
    *   Confirm all necessary environment variables (e.g., `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `ENCRYPTION_SECRET`, etc. if any backend routes were enabled/tested) are correctly configured in Vercel project settings for the `production` environment. (Shopify integration itself is out of scope for *this* launch but `vault.tiptopbrushes.com` is its future home.)

## **3.0 Deployment Step A: Primary V1.0 Launch (Vercel)**

This is the main launch to `vault.tiptopbrushes.com`.

1.  **[ ] `vercel.json` Configuration:**
    *   Ensure the `vercel.json` file is present at the root of your `brushvault` project.
    *   **Crucially, verify the `Content-Security-Policy` header matches the strict configuration.** This is vital for security and PWA functionality.

    ```json
    {
      "headers": [
        {
          "source": "/(.*)",
          "headers": [
            {
              "key": "Content-Security-Policy",
              "value": "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self';"
            }
          ]
        }
      ]
    }
    ```
2.  **[ ] Push to GitHub & Trigger Vercel Deployment:**
    *   Ensure your `main` branch contains the latest V1.0 code.
    *   Push your local changes to the remote GitHub repository that Vercel is hooked up to (`junovhs/brushvault`): `git push origin main`.
    *   Confirm Vercel automatically detects the push and initiates a production deployment.
    *   Monitor the Vercel dashboard (`app.vercel.com`) for the deployment status. It should indicate `Ready` for your production domain `vault.tiptopbrushes.com`.

## **4.0 Deployment Step B: Legacy GitHub Pages Update (For Beta User Migration)**

This step ensures existing beta users can access the updated "Backup Library" feature from their old URL.

1.  **[ ] Update GitHub Pages Branch:**
    *   If your GitHub Pages is served from a separate branch (e.g., `gh-pages`) or a subfolder of `main`, ensure the V1.0 code is pushed to that specific branch/location.
    *   Example for `main` branch `docs` folder setup: `git push origin main` (and GitHub Pages configured to serve from `docs`).
    *   Example for `gh-pages` branch: `git checkout gh-pages` then `git merge main` (resolve conflicts), then `git push origin gh-pages`.
2.  **[ ] Verify GitHub Pages Build:**
    *   Check your GitHub repository's "Actions" or "Pages" tab to ensure the build and deployment process for `junovhs.github.io/brushcmdr/` completes successfully.

## **5.0 Post-Deployment Verification (Live URLs)**

After both deployments are complete, thoroughly test both live application URLs.

*   **5.1 `vault.tiptopbrushes.com` (Primary V1.0 Launch Target):**
    *   **[ ] App Loading:** Confirm the application loads successfully without errors.
    *   **[ ] Passcode Gate:** Verify the passcode gate is active and functions correctly. (This will be removed later when Shopify integration is complete).
    *   **[ ] Console Errors:** Confirm **NO** JavaScript errors on load or interaction.
    *   **[ ] PWA / Service Worker:** Verify `sw.js` is `activated` and `CACHE_NAME` is correct (e.g., `v1.0.6`). Test "Add to Home Screen".
    *   **[ ] V1.0 Feature Set:**
        *   **[ ] Import:** Verify file import.
        *   **[ ] Brush Inspector:** Verify full functionality (zoom, pan, DNA, accurate behavior facts, navigation).
        *   **[ ] Backup Library:** Successfully download a `.brushvault` file.
        *   **[ ] Restore Library:** Successfully restore from the `.brushvault` file.
        *   **[ ] Export .brushset:** Successfully export a custom `.brushset`.
        *   **[ ] Core UI:** All basic functionalities work.
*   **5.2 `junovhs.github.io/brushcmdr/` (Legacy Backup Path):**
    *   **[ ] App Loading:** Confirms the application loads successfully.
    *   **[ ] Console Errors:** Verify **NO** critical errors.
    *   **[ ] Backup Library:** **Crucially, verify that the "Backup Library" button works correctly on this older URL.** This is its sole purpose for existing beta users. (Restoring from here might be complex/problematic and should be discouraged).

## **6.0 Communication Strategy**

*   **[ ] Announcement for `vault.tiptopbrushes.com`:** Clearly communicate that **this new URL is the official V1.0 app**. It's the future home.
*   **[ ] Migration Instructions:** Provide clear instructions for existing beta users on `junovhs.github.io/brushcmdr/` to:
    1.  Visit the old URL.
    2.  Use the new "Backup Library" feature to save their `.brushvault` file.
    3.  Go to `vault.tiptopbrushes.com`.
    4.  Use "Restore Library" to import their data.
    5.  Encourage them to uninstall the old PWA/bookmark and install the new one.

## **7.0 Monitoring**

*   **[ ] Vercel Dashboard:** Monitor deployment and runtime logs.
*   **[ ] GitHub Repository:** Monitor Actions/Pages builds for the legacy deployment.
*   **[ ] User Feedback:** Be prepared to collect and address any user-reported issues post-launch.

---