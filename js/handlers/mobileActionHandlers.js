// --- Event Handlers for Mobile-Specific UI Actions ---

function handleMobileNavToggle() {
    toggleMobileSidebar();
}

function handleMobileSearchToggle() {
    toggleMobileSearch();
    // Focus the input when the search bar is opened
    if (mobileSearchBar && mobileSearchBar.classList.contains('active')) {
        if(mobileSearchInput) mobileSearchInput.focus();
    } else {
        // If the search bar is closed and had a value, clear it and refresh the view
        if(mobileSearchInput && mobileSearchInput.value !== '') {
            mobileSearchInput.value = '';
            if(searchInput) searchInput.value = ''; 
            loadBrushesFromDBAndRender();
        }
    }
}

function handleMobileSearchInput() {
    // Sync the desktop search input's value for consistent state
    if(searchInput && mobileSearchInput) searchInput.value = mobileSearchInput.value; 
    loadBrushesFromDBAndRender();
}

function handleMobileSortToggle() {
    toggleMobileSort();
}

function handleMobileSortSelect(event) {
    const sortButton = event.target.closest('button[data-sort]');
    if (sortButton) {
        const newSortValue = sortButton.dataset.sort;
        if(sortSelect) sortSelect.value = newSortValue;
        updateMobileSortUI(newSortValue);
        loadBrushesFromDBAndRender();
        toggleMobileSort(false); // Close the sort options after selection
    }
}

function handleMobileTagAction() {
    if (selectedBrushInternalIds.size === 0) {
        updateStatus("No brushes selected to tag.", true); 
        return;
    }
    const tagsString = prompt(`Add tags (comma-separated) to ${selectedBrushInternalIds.size} selected brush(es):`);
    
    // If user cancels prompt, tagsString will be null
    if (tagsString === null) return; 

    // Use the desktop input to pass the value to the existing tag handler
    if(tagsToAddInput) tagsToAddInput.value = tagsString; 
    handleApplyTags(); 
    if(tagsToAddInput) tagsToAddInput.value = ''; // Clear for cleanliness
}

function handleMobileEditAction() {
    // This action is only available when a single brush is selected.
    if (selectedBrushInternalIds.size === 1) {
        const brushId = selectedBrushInternalIds.values().next().value;
        // For now, this is a placeholder. A future task could be a dedicated mobile edit screen.
        alert(`Editing is done in the right-side panel on tablets and desktops. A mobile-specific edit screen is planned for a future update.`);
        updateStatus(`To edit, please use a larger screen. Brush ID: ${brushId}.`);
    } else {
        updateStatus("Select a single brush to edit.", true);
    }
}