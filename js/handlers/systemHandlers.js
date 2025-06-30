// ===== START OF FILE: brushvault/js/handlers/systemHandlers.js ===== //
// --- Event Handlers for System-Level Actions ---

async function handleClearDbButtonClick() {
    if (confirm("Are you sure you want to delete ALL brushes from your library? This is permanent and cannot be undone.")) {
        try {
            await db.brushes.clear();
            selectedBrushInternalIds.clear();
            resetUIStates(); 
            updateStatus("Entire brush library has been cleared.");
        } catch (error) {
            console.error("Error clearing database:", error);
            updateStatus("Error clearing the library.", true);
        }
    }
    // Close sidebar if on mobile after action
    if (window.innerWidth <= 640 && sidebar.classList.contains('open')) {
        toggleMobileSidebar(false);
    }
}

function handlePageOverlayClick() {
    // Close any active overlay-using element
    if (sidebar && sidebar.classList.contains('open')) {
        toggleMobileSidebar(false);
    }
    if (mobileSortOptions && mobileSortOptions.classList.contains('active')) {
        toggleMobileSort(false);
    }
    if (helpModal && helpModal.style.display === 'flex') {
        toggleHelpModal(false);
    }
}

function handleHelpToggle() {
    toggleHelpModal();
}

function handleSidebarLinkClick() {
    // This helper function ensures that clicking any sidebar link
    // will close the mobile sidebar if it's open.
    // THIS IS NOW THE ONLY PLACE THIS FUNCTION IS NEEDED.
    if (window.innerWidth <= 640 && sidebar.classList.contains('open')) {
        toggleMobileSidebar(false);
    }
    // Also ensures other modals close if a main nav item is clicked
     if (helpModal && helpModal.style.display === 'flex') { 
        toggleHelpModal(false);
    }
}
// ===== END OF FILE: brushvault/js/handlers/systemHandlers.js ===== //