// --- Global App State Variables ---
let currentViewMode = 'all';
let activeBrushSetFilter = null;
let activeTagFilter = new Set();
let selectedBrushInternalIds = new Set();
let currentlyRenderedBrushes = [];

// --- Core UI State Management and Update Functions ---

function updateStatus(message, isError = false) {
    if (!outputDiv) return;
    const statusMessageClass = isError ? 'status-message error-message' : 'status-message';
    const existingStatusP = outputDiv.querySelector('p.status-message');
    if (existingStatusP) existingStatusP.remove();
    const newStatusP = document.createElement('p');
    newStatusP.className = statusMessageClass;
    newStatusP.innerHTML = `<span class="info-label">${isError ? 'Error:' : 'Status:'}</span> ${message}`;
    const firstGridItemOrInfoText = outputDiv.querySelector('.brush-card, .info-text');
    if (firstGridItemOrInfoText) outputDiv.insertBefore(newStatusP, firstGridItemOrInfoText);
    else outputDiv.appendChild(newStatusP);
}

function resetUIStates() {
    if(searchInput) searchInput.value = '';
    if(mobileSearchInput) mobileSearchInput.value = '';
    if(sortSelect) sortSelect.value = 'name_asc';
    updateMobileSortUI('name_asc');
    selectedBrushInternalIds.clear();
    activeBrushSetFilter = null;
    activeTagFilter.clear();
    currentViewMode = 'all';
    currentlyRenderedBrushes = [];
    if (sidebar && sidebar.classList.contains('open')) toggleMobileSidebar(false);
    if (mobileSearchBar && mobileSearchBar.classList.contains('active')) toggleMobileSearch(false);
    if (mobileSortOptions && mobileSortOptions.classList.contains('active')) toggleMobileSort(false);
    if (helpModal && helpModal.style.display !== 'none') toggleHelpModal(false);
    loadBrushesFromDBAndRender();
}

function updateActiveSidebarLink() {
    document.querySelectorAll('.sidebar-menu .active-link').forEach(el => el.classList.remove('active-link'));
    switch (currentViewMode) {
        case 'all': if (allBrushesLink) allBrushesLink.classList.add('active-link'); break;
        case 'favorites': if (favoritesLink) favoritesLink.classList.add('active-link'); break;
        case 'set':
            if (activeBrushSetFilter && brushSetsListUL) {
                const setLink = brushSetsListUL.querySelector(`a[data-set-name="${CSS.escape(activeBrushSetFilter)}"]`);
                if (setLink?.parentElement.classList.contains('sidebar-item-container')) setLink.parentElement.classList.add('active-link');
            }
            break;
        case 'tag':
            if (tagsListUL && activeTagFilter.size > 0) {
                activeTagFilter.forEach(tagName => {
                    const tagButton = tagsListUL.querySelector(`button[data-tag-name="${CSS.escape(tagName)}"]`);
                    if(tagButton) {
                        if (tagButton.parentElement.classList.contains('sidebar-item-container')) tagButton.parentElement.classList.add('active-link');
                        else tagButton.classList.add('active-link');
                    }
                });
            }
            break;
    }
}

function updateMainContentTitle(count) {
    if (!mainContentTitleAppHeader) return;
    let title = "Brushes";
    switch (currentViewMode) {
        case 'all': title = 'All Brushes'; break;
        case 'favorites': title = 'Favorites'; break;
        case 'set': title = activeBrushSetFilter ? `Set: ${activeBrushSetFilter}` : 'All Brushes'; break;
        case 'tag':
            if (activeTagFilter.has('UNTAGGED_FILTER')) title = 'Untagged Brushes';
            else if (activeTagFilter.size > 0) title = `Tagged: ${Array.from(activeTagFilter).join(' & ')}`;
            else title = 'All Brushes';
            break;
    }
    const countText = (count !== undefined) ? `(${count})` : '';
    mainContentTitleAppHeader.textContent = `${title} ${countText}`.trim();
    mainContentTitleAppHeader.title = mainContentTitleAppHeader.textContent; 
}

function updateSelectDeselectAllButtonsState() {
    const hasBrushesInView = currentlyRenderedBrushes.length > 0;
    const hasSelections = selectedBrushInternalIds.size > 0;
    const allVisibleSelected = hasBrushesInView && currentlyRenderedBrushes.every(brush => selectedBrushInternalIds.has(brush.internalId));
    if (selectAllButtonDesktop) selectAllButtonDesktop.disabled = !hasBrushesInView || allVisibleSelected;
    if (deselectAllButtonDesktop) deselectAllButtonDesktop.disabled = !hasSelections;
}

// Moved from systemHandlers to be globally accessible
function toggleHelpModal(forceOpen = null) {
    if (!helpModal || !pageOverlay) return;
    const isOpen = helpModal.style.display === 'flex';

    if (forceOpen === true || (forceOpen === null && !isOpen)) {
        helpModal.style.display = 'flex';
        pageOverlay.classList.add('active'); 
    } else if (forceOpen === false || (forceOpen === null && isOpen)) {
        helpModal.style.display = 'none';
        if ((!sidebar || !sidebar.classList.contains('open')) && (!mobileSortOptions || !mobileSortOptions.classList.contains('active'))) {
            pageOverlay.classList.remove('active');
        }
    }
}

// --- Main Application Entry Point ---
document.addEventListener('DOMContentLoaded', async () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(reg => console.log('Service Worker registered with scope:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    }
    if (typeof window.bplistParserManual?.parseBuffer !== 'function' || typeof Dexie === 'undefined' || typeof JSZip === 'undefined') {
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: white; background: #f44336;">CRITICAL ERROR: A required library failed to load. The application cannot start.</div>';
        return;
    }
    try {
        await db.open();
        console.log(`Database opened successfully. Schema version: ${db.verno}`);
    } catch (error) {
        console.error("FATAL: Failed to open Dexie database:", error);
        if (typeof updateStatus === 'function') updateStatus(`CRITICAL DATABASE ERROR: ${error.message}. Please clear site data.`, true);
        return;
    }

    initPWA();
    resetUIStates();

    // Attach all event listeners
    if (fileInput) fileInput.addEventListener('change', handleFileInputChange);
    if (backupLibraryButton) backupLibraryButton.addEventListener('click', handleBackupLibraryClick);
    if (restoreLibraryInput) restoreLibraryInput.addEventListener('change', handleRestoreLibraryChange);
    if (clearDbButton) clearDbButton.addEventListener('click', handleClearDbButtonClick);
    if (selectAllButtonDesktop) selectAllButtonDesktop.addEventListener('click', handleSelectAllVisible);
    if (deselectAllButtonDesktop) deselectAllButtonDesktop.addEventListener('click', handleDeselectAll);
    if (allBrushesLink) allBrushesLink.addEventListener('click', handleAllBrushesFilterClick);
    if (favoritesLink) favoritesLink.addEventListener('click', handleFavoritesFilterClick);
    if (saveBrushDetailsButton) saveBrushDetailsButton.addEventListener('click', handleSaveBrushDetails);
    if (applyTagsButton) applyTagsButton.addEventListener('click', handleApplyTags);
    if (createNewSetButton) createNewSetButton.addEventListener('click', handleCreateNewBrushSet);
    if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelectedBrushes);
    if (searchInput) searchInput.addEventListener('input', handleSearchInputChange);
    if (sortSelect) sortSelect.addEventListener('change', handleSortSelectChange);
    if (pageOverlay) pageOverlay.addEventListener('click', handlePageOverlayClick);
    if (headerHelpToggle) headerHelpToggle.addEventListener('click', handleHelpToggle);
    if (mobileHeaderHelpToggle) mobileHeaderHelpToggle.addEventListener('click', handleHelpToggle);
    if (closeHelpModal) closeHelpModal.addEventListener('click', handleHelpToggle);
    if (mobileNavToggle) mobileNavToggle.addEventListener('click', handleMobileNavToggle);
    const mobileSearchToggle = document.getElementById('mobileSearchToggle');
    if (mobileSearchToggle) mobileSearchToggle.addEventListener('click', handleMobileSearchToggle);
    if (mobileSearchInput) mobileSearchInput.addEventListener('input', handleMobileSearchInput);
    const mobileSortToggle = document.getElementById('mobileSortToggle');
    if (mobileSortToggle) mobileSortToggle.addEventListener('click', handleMobileSortToggle);
    if (mobileSortOptions) mobileSortOptions.addEventListener('click', handleMobileSortSelect);
    const restoreLibraryLabel = document.getElementById('restoreLibraryLabel');
    if (restoreLibraryLabel) {
        restoreLibraryLabel.addEventListener('click', (event) => {
            event.preventDefault();
            if (confirm("Restoring from a backup will completely DELETE your current library... Are you sure?")) {
                if (restoreLibraryInput) restoreLibraryInput.click();
            } else {
                if(typeof updateStatus === 'function') updateStatus("Restore operation cancelled.");
            }
        });
    }

    window.addEventListener('resize', () => {
        updateSelectedBrushActionsPanelContent();
        if (window.innerWidth > 640) {
            if (sidebar?.classList.contains('open')) toggleMobileSidebar(false);
            if (mobileSearchBar?.classList.contains('active')) toggleMobileSearch(false);
            if (mobileSortOptions?.classList.contains('active')) toggleMobileSort(false);
        }
    });

    console.log("Brush Commander Initialized.");
    if (typeof updateStatus === 'function') updateStatus("Welcome to Brush Commander!");
});