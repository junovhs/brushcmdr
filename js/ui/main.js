// --- Main Application Entry Point ---

// --- Global App State Variables ---
let currentViewMode = 'all';
let activeBrushSetFilter = null;
let activeTagFilter = new Set();
let selectedBrushInternalIds = new Set();
let currentlyRenderedBrushes = [];

document.addEventListener('DOMContentLoaded', async () => {
    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(registration => console.log('Service Worker registered with scope:', registration.scope))
            .catch(error => console.error('Service Worker registration failed:', error));
    }

    // --- Critical Dependency Checks ---
    if (typeof window.bplistParserManual?.parseBuffer !== 'function' || typeof Dexie === 'undefined' || typeof JSZip === 'undefined') {
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: white; background: #f44336;">CRITICAL ERROR: A required library (Dexie, JSZip, or bplistParser) failed to load. The application cannot start. Please check your connection and try again.</div>';
        return;
    }

    // --- Database Initialization ---
    try {
        await db.open();
        console.log(`Database opened successfully. Schema version: ${db.verno}`);
    } catch (error) {
        console.error("FATAL: Failed to open Dexie database:", error);
        if (typeof updateStatus === 'function') updateStatus(`CRITICAL DATABASE ERROR: ${error.message}. Please clear site data or contact support.`, true);
        return;
    }

    // --- Initial UI Setup ---
    initPWA();
    resetUIStates();

    // --- ATTACH ALL EVENT LISTENERS ---
    
    // Main data handlers
    if (fileInput) fileInput.addEventListener('change', handleFileInputChange);
    if (backupLibraryButton) backupLibraryButton.addEventListener('click', handleBackupLibraryClick);
    if (restoreLibraryInput) restoreLibraryInput.addEventListener('change', handleRestoreLibraryChange);
    if (clearDbButton) clearDbButton.addEventListener('click', handleClearDbButtonClick);
    
    // Header actions
    if (selectAllButtonDesktop) selectAllButtonDesktop.addEventListener('click', handleSelectAllVisible);
    if (deselectAllButtonDesktop) deselectAllButtonDesktop.addEventListener('click', handleDeselectAll);

    // Sidebar navigation
    if (allBrushesLink) allBrushesLink.addEventListener('click', handleAllBrushesFilterClick);
    if (favoritesLink) favoritesLink.addEventListener('click', handleFavoritesFilterClick);
    
    // Panel actions
    if (saveBrushDetailsButton) saveBrushDetailsButton.addEventListener('click', handleSaveBrushDetails);
    if (applyTagsButton) applyTagsButton.addEventListener('click', handleApplyTags);
    if (createNewSetButton) createNewSetButton.addEventListener('click', handleCreateNewBrushSet);
    if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelectedBrushes);
    
    // System and Search
    if (searchInput) searchInput.addEventListener('input', handleSearchInputChange);
    if (sortSelect) sortSelect.addEventListener('change', handleSortSelectChange);
    if (pageOverlay) pageOverlay.addEventListener('click', handlePageOverlayClick);

    // Help Modal
    const helpToggleDesktop = document.getElementById('headerHelpToggle');
    const helpToggleMobile = document.getElementById('mobileHeaderHelpToggle');
    if(helpToggleDesktop) helpToggleDesktop.addEventListener('click', handleHelpToggle);
    if(helpToggleMobile) helpToggleMobile.addEventListener('click', handleHelpToggle);
    if (closeHelpModal) closeHelpModal.addEventListener('click', handleHelpToggle);

    // Restore Label (for iPad fix)
    const restoreLibraryLabel = document.getElementById('restoreLibraryLabel');
    if (restoreLibraryLabel) {
        restoreLibraryLabel.addEventListener('click', (event) => {
            event.preventDefault();
            if (confirm("Restoring from a backup will completely DELETE your current library and replace it with the contents of the backup file. This cannot be undone. Are you absolutely sure?")) {
                if (restoreLibraryInput) restoreLibraryInput.click();
            } else {
                if(typeof updateStatus === 'function') updateStatus("Restore operation cancelled by user.");
            }
        });
    }
    
    // Mobile Toggles
    if (mobileNavToggle) mobileNavToggle.addEventListener('click', handleMobileNavToggle);
    if (document.getElementById('mobileSearchToggle')) document.getElementById('mobileSearchToggle').addEventListener('click', handleMobileSearchToggle);
    if (mobileSearchInput) mobileSearchInput.addEventListener('input', handleMobileSearchInput);
    if (document.getElementById('mobileSortToggle')) document.getElementById('mobileSortToggle').addEventListener('click', handleMobileSortToggle);
    if (mobileSortOptions) mobileSortOptions.addEventListener('click', handleMobileSortSelect);


    console.log("Brush Commander Initialized and Event Listeners Attached.");
    if (typeof updateStatus === 'function') updateStatus("Welcome to Brush Commander! Import .brush or .brushset files to begin.");
});