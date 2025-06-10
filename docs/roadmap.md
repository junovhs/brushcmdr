# **Roadmap: Brush Commander**

This document outlines the planned development phases for Brush Commander, from immediate launch objectives to long-term aspirations.

---

## **Phase 1: The Vault Relaunch (Target: Next 24-48 Hours)**

**Objective:** To securely launch the new "Tiptop Brush Vault" offering and establish a safe, professional foundation for all future development.

*   **[DELIVERABLE] Secure & Private App Deployment:**
    *   Migrate the application from a public GitHub Pages site to a **private GitHub repository**.
    *   Deploy this private repository to **Vercel** to ensure the codebase for the commercial vault is not publicly accessible.
    *   Configure a professional, branded subdomain (e.g., `vault.tiptopbrushes.com`) for the Vercel deployment.

*   **[DELIVERABLE] In-App "Store" UI:**
    *   Implement a new "Store" section within the Brush Commander UI.
    *   This view will feature a grid of all Tiptop Brush packs, displaying high-quality product art, descriptions, and links to public product pages.

*   **[DELIVERABLE] Seamless, Secure Download Flow:**
    *   Clicking a product in the store triggers a clean confirmation modal.
    *   The final download is initiated from Shopify's secure servers, ensuring file integrity and security.
    *   Implement a "Guided Import" UX enhancement to prompt users to immediately add the downloaded set to their Brush Commander library.

*   **[DELIVERABLE] Legacy User Protection & Migration Path:**
    *   Implement a robust **"Library Backup & Restore"** feature in the *original* GitHub Pages version of the app using `dexie-export-import`.
    *   Draft and send a clear, supportive email to all existing customers, instructing them on how to back up their data and informing them of the upcoming app evolution.

---

## **Phase 2: Consolidation & Polish (Post-Launch)**

**Objective:** To unify the user base, gather feedback, and refine the core experience.

*   **User Migration Campaign:** Actively encourage legacy users to migrate their libraries to the new Vercel-hosted application using the Backup/Restore tool.
*   **UI/UX Refinements:** Act on user feedback from the relaunch to polish workflows, improve UI clarity, and fix any minor bugs.
*   **Performance Optimization:** Analyze and optimize the performance of the brush grid, especially for users with thousands of brushes.

---

## **Phase 3: The "Must-Have" Tool (Future Vision)**

**Objective:** To expand Brush Commander's feature set to make it an indispensable part of every Procreate artist's toolkit.

*   **Advanced Brush Management:**
    *   **Smart Tagging:** AI-assisted suggestions for tagging brushes based on their names and properties.
    *   **Visual Search:** The ability to find brushes by drawing a sample stroke.
    *   **Advanced Filtering:** Filter by brush properties (e.g., grain type, stabilization amount).
*   **Deeper Integration:**
    *   **Pro Palette Integration:** Create a seamless link between Brush Commander and Pro Palette to manage toolsets and color sets together.
    *   **One-Click Procreate Export (Exploratory):** Investigate iOS Shortcuts or other mechanisms to streamline sending a `.brushset` file to Procreate.
*   **Community & Sharing:**
    *   **Shareable Collections:** Allow users to export a list of their favorite Tiptop brushes (not the files themselves) to share with others. If a user has the vault, they can instantly assemble that shared collection.

---