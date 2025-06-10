# **Current Task: Implement the "Store Mode" UI & Secure Foundation**

## **1. Mandate / Objective**

Refactor the Brush Commander application to support two primary views: the user's personal **"Library"** and the commercial **"Store"**. This involves creating the necessary UI components, implementing the view-switching logic, and preparing the application for its new, secure deployment on Vercel.

---

## **2. Acceptance Criteria (What "Done" Looks Like)**

1.  A "Store" link is present in the main sidebar navigation.
2.  Clicking the "Store" link hides the user's brush library and search/sort controls, and displays a grid of all Tiptop Brush packs.
3.  Clicking any other sidebar link (All Brushes, Favorites, etc.) hides the store grid and shows the user's library and appropriate controls.
4.  Clicking a product in the store grid opens a confirmation modal displaying the product art and name.
5.  Confirming the download initiates the file download and triggers the "Guided Import" UI bar.
6.  The application code is ready to be deployed from a new private repository to Vercel without a password gate.

---

## **3. Implementation Plan**

This is the explicit, step-by-step plan for the code modifications.

### **File: `index.html`**

1.  **Add Store Navigation Link:** In the main `<ul class="sidebar-menu">`, add a new list item for the store.
    ```html
    <li><a href="#" id="storeLink">Store</a></li>
    ```
2.  **Restructure Main Content Area:** Wrap the existing brush library in a new `div#libraryContainer` and add `div#storeContainer` alongside it. The `storeContainer` will be hidden by default.
    ```html
    <div id="libraryContainer" class="brush-library-container">
        <div id="output" class="brush-grid">...</div>
    </div>

    <div id="storeContainer" class="brush-library-container" style="display: none;">
        <div id="vaultGrid" class="brush-grid">
            <!-- All .vault-item-clickable product cards go here -->
        </div>
    </div>
    ```
3.  **Populate the Store Grid:** Fill `#vaultGrid` with the `div.vault-item-clickable` blocks for every product, ensuring all `data-*` attributes and URLs are correct.
4.  **Add Confirmation Modal:** Paste the complete HTML for the `#downloadConfirmModal` at the end of the `appWrapper` div.

### **File: `css/style.css`**

1.  **Add New Styles:** Append all the CSS rules for `.vault-item-clickable`, its hover effects, and its child elements (`.vault-item-footer`, `.learn-more-link`) to the end of the file.

### **File: `js/domElements.js`**

1.  **Add New Element References:** Add constants for the new elements.
    ```javascript
    const storeLink = document.getElementById('storeLink');
    const libraryContainer = document.getElementById('libraryContainer');
    const storeContainer = document.getElementById('storeContainer');
    // ... plus all the download confirmation modal elements.
    ```

### **File: `js/ui.js`**

1.  **Create `switchToView()` function:** This master function will handle all UI state changes between 'library' and 'store' modes. It will be responsible for:
    *   Hiding/showing `#libraryContainer` and `#storeContainer`.
    *   Hiding/showing desktop search/sort controls.
    *   Updating the main header title (`#mainContentTitleAppHeader`).
    *   Setting the `active-link` class on the correct sidebar item.

### **File: `js/eventHandlers.js`**

1.  **Refactor Sidebar Handlers:** Modify `handleAllBrushesFilterClick`, `handleFavoritesFilterClick`, etc., to call `switchToView('library')` instead of directly manipulating the DOM.
2.  **Create `handleStoreLinkClick()`:** This new function will call `switchToView('store')`.
3.  **Implement Confirmation Flow:** Create the `openDownloadConfirmation()` and `closeDownloadConfirmation()` functions to manage the new modal. The existing `handleVaultDownload()` function will be called from the final "Download Now" button.

### **File: `js/main.js`**

1.  **Add Event Listener:** Attach the `handleStoreLinkClick` function to the new `storeLink` element.

---

## **4. AI Developer Handoff & Mandate**

> **Your Mandate:** You are the primary developer for this task. I will serve as the project director, tester, and provide feedback. Your responsibility is to implement the features as outlined in this document.
>
> **Your Rules of Engagement:**
>
> 1.  **Full Function/File Replacement:** When you propose a code change, you must provide, at minimum, the entire function that the change resides within.
> 2.  **Full File for Major Changes:** If changes span multiple functions or involve significant restructuring within a single file, provide the complete code for that file.
> 3.  **Automatic Refactoring:** If a file you need to provide exceeds **400 lines of code (LOC)**, you must first refactor it. Break the file into multiple, logical, smaller files (under 300 LOC), explain the new file structure concisely, and then provide the new, smaller files with the requested changes implemented.
> 4.  **Take Ownership:** I am counting on you to understand the project's goals, write clean, efficient code, and be proactive in suggesting improvements that align with our vision. You are not just a code generator; you are the architect of this implementation.