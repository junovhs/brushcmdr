// --- Event Handler Functions ---

function handleCardClick(event, brushId) {
    if (event.target.closest('.icon-button')) {
        return;
    }
    const checkbox = document.getElementById(`checkbox-${brushId}`);
    if (checkbox) {
        if (event.target !== checkbox && event.target.htmlFor !== checkbox.id) {
            checkbox.click();
        }
    }
}

function handleBrushSelectionChange(event) {
    const checkbox = event.target;
    const id = parseInt(checkbox.dataset.internalId);
    const card = document.querySelector(`.brush-card[data-internal-id="${id}"]`);

    if (checkbox.checked) {
        selectedBrushInternalIds.add(id);
        if (card) card.classList.add('selected');
    } else {
        selectedBrushInternalIds.delete(id);
        if (card) card.classList.remove('selected');
    }

    updateSelectedBrushActionsPanelContent();

    if (selectedBrushInternalIds.size === 1 && window.innerWidth > 640) {
        const singleSelectedId = selectedBrushInternalIds.values().next().value;
        populateEditPanel(singleSelectedId);
    } else if (window.innerWidth > 640) {
        if (selectedBrushInternalIds.size === 0) {
            if(brushNameInput) brushNameInput.value = '';
            if(brushIsFavoriteCheckbox) brushIsFavoriteCheckbox.checked = false;
            if(brushNotesTextarea) brushNotesTextarea.value = '';
            if(archiveInsightsContent) archiveInsightsContent.textContent = 'Select a brush to see insights...';
            if(panelHeader && singleBrushEditSection && singleBrushEditSection.style.display === 'none') {
                 panelHeader.textContent = "Brush Actions";
            }
        }
    }
    updateSelectDeselectAllButtonsState();
}


async function handleSaveBrushDetails() {
    if (selectedBrushInternalIds.size !== 1) {
        updateStatus("Please select a single brush to save details.", true);
        return;
    }
    const brushId = selectedBrushInternalIds.values().next().value;
    const newName = brushNameInput.value.trim();
    const newNotes = brushNotesTextarea.value.trim();
    const newIsFavorite = brushIsFavoriteCheckbox.checked;

    if (!newName) {
        updateStatus("Brush name cannot be empty.", true);
        return;
    }
    try {
        await db.brushes.update(brushId, {
            name: newName,
            notes: newNotes,
            isFavorite: newIsFavorite
        });
        updateStatus(`Brush "${newName}" details saved successfully.`);
        await loadBrushesFromDBAndRender();

        const card = document.querySelector(`.brush-card[data-internal-id="${brushId}"]`);
        if (card) {
            const img = card.querySelector('.brush-preview-wrapper img');
            if (img && img.src && img.src.startsWith('blob:')) {
                const currentSrc = img.getAttribute('src');
                img.setAttribute('src', ''); 
                setTimeout(() => { 
                    img.setAttribute('src', currentSrc); 
                }, 0);
            }
        }


    } catch (error) {
        console.error("Error saving brush details:", error);
        updateStatus("Error saving brush details.", true);
    }
}

async function handleToggleFavorite(brushId) {
    try {
        const brush = await db.brushes.get(brushId);
        if (brush) {
            const newFavoriteStatus = !brush.isFavorite;
            await db.brushes.update(brushId, { isFavorite: newFavoriteStatus });
            await loadBrushesFromDBAndRender(); 

            if (selectedBrushInternalIds.has(brushId) && selectedBrushInternalIds.size === 1 && window.innerWidth > 640) {
                if(brushIsFavoriteCheckbox) brushIsFavoriteCheckbox.checked = newFavoriteStatus;
            }

            const card = document.querySelector(`.brush-card[data-internal-id="${brushId}"]`);
            if (card) {
                const img = card.querySelector('.brush-preview-wrapper img');
                 if (img && img.src && img.src.startsWith('blob:')) {
                    const currentSrc = img.getAttribute('src');
                    img.setAttribute('src', ''); 
                    setTimeout(() => { 
                         img.setAttribute('src', currentSrc);
                    }, 0);
                }
            }
        }
    } catch (error) {
        console.error("Error toggling favorite:", error);
        updateStatus("Error updating favorite status.", true);
    }
}

async function handleDeleteSingleBrush(brushId) {
    const brush = await db.brushes.get(brushId);
    if (!brush) {
        updateStatus("Brush not found for deletion.", true);
        return;
    }
    if (confirm(`Are you sure you want to delete the brush "${brush.name}"? This is permanent.`)) {
        try {
            await db.brushes.delete(brushId);
            selectedBrushInternalIds.delete(brushId); // Make sure to update selection
            updateStatus(`Brush "${brush.name}" deleted.`);
            await loadBrushesFromDBAndRender(); // This will also update panel and fixed button
        } catch (e) {
            console.error("Error deleting brush:", e);
            updateStatus("Error deleting brush.", true);
        }
    }
}

async function handleDeleteSelectedBrushes() { // This function is for the FIXED button and MOBILE delete
    const count = selectedBrushInternalIds.size;
    if (count === 0) {
        updateStatus("No brushes selected to delete.", true);
        return;
    }
    if (confirm(`Are you sure you want to delete ${count} selected brush(es)? This is permanent.`)) {
        try {
            const idsToDelete = Array.from(selectedBrushInternalIds);
            await db.brushes.bulkDelete(idsToDelete);
            selectedBrushInternalIds.clear();
            updateStatus(`${count} brush(es) deleted successfully.`);
            await loadBrushesFromDBAndRender(); // This will also update panel and fixed button
        } catch (e) {
            console.error("Error deleting selected brushes:", e);
            updateStatus("Error deleting selected brushes.", true);
        }
    }
}

async function handleApplyTags() {
    const tagsString = tagsToAddInput.value.trim();
    if (selectedBrushInternalIds.size === 0) {
         updateStatus("No brushes selected.", true);
         return;
    }
    if (!tagsString) {
        updateStatus("No tags entered to apply.", true);
        return;
    }
    const newTagsArray = tagsString.split(',').map(tag => tag.trim().toUpperCase()).filter(tag => tag);
    if (newTagsArray.length === 0) {
        updateStatus("No valid tags entered. Tags cannot be empty or just commas.", true);
        return;
    }
    try {
        const brushesToUpdate = await db.brushes.bulkGet(Array.from(selectedBrushInternalIds));
        let updatedCount = 0;
        const updates = brushesToUpdate.map(brush => {
            if (brush) {
                const currentTags = new Set((brush.tags || []).map(t => t.toUpperCase()));
                newTagsArray.forEach(nt => currentTags.add(nt));
                brush.tags = Array.from(currentTags).sort();
                updatedCount++;
                return brush;
            }
            return null;
        }).filter(b => b !== null);

        if (updates.length > 0) {
            await db.brushes.bulkPut(updates);
        }

        tagsToAddInput.value = '';
        updateStatus(`Tags applied to ${updatedCount} brush(es).`);
        await loadBrushesFromDBAndRender();
        if(window.innerWidth > 640 && selectedBrushInternalIds.size > 0) {
             await updateCommonTagsDisplayForPanel();
        } else if (window.innerWidth > 640 && commonTagsDisplayDiv) {
            commonTagsDisplayDiv.innerHTML = '';
        }
    } catch (e) {
        console.error("Error applying tags:", e);
        updateStatus("Error applying tags.", true);
    }
}

async function handleRemoveTagFromSelected(event) {
    const tagToRemove = event.target.dataset.tagName;
    if (!tagToRemove || selectedBrushInternalIds.size === 0) return;

    if (!confirm(`Remove tag "${tagToRemove}" from ${selectedBrushInternalIds.size} selected brush(es)?`)) return;

    try {
        const brushesToUpdate = await db.brushes.bulkGet(Array.from(selectedBrushInternalIds));
        let actualUpdatedCount = 0;

        const updates = brushesToUpdate.map(brush => {
            if (brush && brush.tags) {
                const originalTagCount = brush.tags.length;
                const tagToRemoveUpper = tagToRemove.toUpperCase();
                brush.tags = brush.tags.filter(t => t.toUpperCase() !== tagToRemoveUpper);
                if (brush.tags.length < originalTagCount) {
                    actualUpdatedCount++;
                }
                return brush;
            }
            return null;
        }).filter(b => b!==null);

        if (updates.length > 0) {
           await db.brushes.bulkPut(updates);
        }

        updateStatus(`Tag "${tagToRemove}" removed from ${actualUpdatedCount} brush(es).`);
        await loadBrushesFromDBAndRender();
        if(window.innerWidth > 640 && selectedBrushInternalIds.size > 0) {
            await updateCommonTagsDisplayForPanel();
        } else if (window.innerWidth > 640 && commonTagsDisplayDiv) {
            commonTagsDisplayDiv.innerHTML = '';
        }
    } catch (e) {
        console.error("Error removing tag:", e);
        updateStatus(`Error removing tag "${tagToRemove}".`, true);
    }
}

async function handleCreateNewBrushSet() {
    let brushesToPackageInternalIds = [];
    let setNameDefault = "My Custom Set";
    let operationType = "selected brushes";

    if (selectedBrushInternalIds.size > 0) {
        if (IS_DEMO_MODE && createNewSetButton && createNewSetButton.classList.contains('button-style-disabled')) { // Check if button is actually disabled by demo mode
            alert("Creating .brushset files from selected brushes is a premium feature. Please upgrade!");
            return;
        }
        brushesToPackageInternalIds = Array.from(selectedBrushInternalIds);
        setNameDefault = `Selected Brushes Set (${brushesToPackageInternalIds.length})`;
    } else if (currentlyRenderedBrushes.length > 0) {
        if (IS_DEMO_MODE && createNewSetButton && createNewSetButton.classList.contains('button-style-disabled')) {
             alert("Exporting the current view as a .brushset is a premium feature. Please upgrade!");
             return;
        }
        if (!confirm(`No brushes are selected. Do you want to export all ${currentlyRenderedBrushes.length} brushes currently in view as a new .brushset?`)) {
            updateStatus("Brushset creation cancelled.", true);
            return;
        }
        brushesToPackageInternalIds = currentlyRenderedBrushes.map(b => b.internalId);
        setNameDefault = `View Export Set (${brushesToPackageInternalIds.length})`;
        operationType = "brushes in current view";
    } else {
        updateStatus("No brushes selected or in view to create a set from.", true);
        return;
    }

    if (brushesToPackageInternalIds.length === 0) {
        updateStatus(`No ${operationType} to package.`, true);
        return;
    }

    const setName = prompt(`Enter a name for the new .brushset file (containing ${brushesToPackageInternalIds.length} ${operationType}):`, setNameDefault);
    if (!setName || !setName.trim()) {
        updateStatus("Brushset creation cancelled (no name provided).", true);
        return;
    }
    updateStatus(`Creating '${setName}.brushset'... This may take a moment.`);
    try {
        const brushesToPackage = await db.brushes.bulkGet(brushesToPackageInternalIds);
        const zip = new JSZip();
        const brushUUIDsForPlist = [];
        let skippedCount = 0;
        for (const brush of brushesToPackage) {
            if (!brush || !brush.uuid || !brush.brushArchiveBlob || !brush.thumbnailBlob) {
                console.warn(`Skipping brush "${brush ? brush.name : 'Unknown'}" for set export due to missing core assets.`);
                skippedCount++;
                continue;
            }
            const brushFolderInZip = zip.folder(brush.uuid);
            brushFolderInZip.file("Brush.archive", brush.brushArchiveBlob);
            brushFolderInZip.folder("QuickLook").file("Thumbnail.png", brush.thumbnailBlob);
            if (brush.shapeBlob) brushFolderInZip.file("Shape.png", brush.shapeBlob);
            if (brush.grainBlob) brushFolderInZip.file("Grain.png", brush.grainBlob);
            brushUUIDsForPlist.push(brush.uuid);
        }
        if (brushUUIDsForPlist.length === 0) {
            updateStatus("No valid brushes could be packaged. Set creation failed.", true);
            return;
        }
        let plistContent = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>name</key>\n  <string>${setName.replace(/[<&>]/g, c => ({'<':'<','>':'>','&':'&'})[c])}</string>\n  <key>brushes</key>\n  <array>\n`;
        brushUUIDsForPlist.forEach(uuid => { plistContent += `    <string>${uuid}</string>\n`; });
        plistContent += `  </array>\n</dict>\n</plist>`;
        zip.file('brushset.plist', plistContent);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: "DEFLATE", compressionOptions: { level: 6 } });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        const sanitizedFileName = setName.replace(/[^a-z0-9_.-]+/gi, '_').replace(/\.$/, '');
        downloadLink.download = `${sanitizedFileName || 'Untitled'}.brushset`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
        let successMessage = `Successfully created and downloaded '${sanitizedFileName}.brushset' with ${brushUUIDsForPlist.length} brush(es).`;
        if (skippedCount > 0) successMessage += ` ${skippedCount} brush(es) were skipped due to missing assets.`;
        updateStatus(successMessage);
    } catch (error) {
        console.error("Error creating .brushset:", error);
        updateStatus(`Error creating .brushset: ${error.message}`, true);
    }
}

function handleSidebarLinkClick() {
    if (window.innerWidth <= 640 && sidebar.classList.contains('open')) {
        toggleMobileSidebar(false);
    }
     if (helpModal && helpModal.style.display === 'flex') { 
        toggleHelpModal(false);
    }
}
function handleAllBrushesFilterClick(e) {
    e.preventDefault();
    currentViewMode = 'all'; activeBrushSetFilter = null; activeTagFilter = null;
    updateActiveSidebarLink(); loadBrushesFromDBAndRender(); handleSidebarLinkClick();
}
function handleFavoritesFilterClick(e) {
    e.preventDefault();
    currentViewMode = 'favorites'; activeBrushSetFilter = null; activeTagFilter = null;
    updateActiveSidebarLink(); loadBrushesFromDBAndRender(); handleSidebarLinkClick();
}
function handleBrushSetFilterClick(e, setName) {
    e.preventDefault();
    currentViewMode = 'set'; activeBrushSetFilter = setName; activeTagFilter = null;
    updateActiveSidebarLink(); loadBrushesFromDBAndRender(); handleSidebarLinkClick();
}
function handleUntaggedFilterClick(e) {
    e.preventDefault();
    currentViewMode = 'tag'; activeTagFilter = 'UNTAGGED_FILTER'; activeBrushSetFilter = null;
    updateActiveSidebarLink(); loadBrushesFromDBAndRender(); handleSidebarLinkClick();
}
function handleTagFilterClick(e, tagName) {
    e.preventDefault();
    currentViewMode = 'tag'; activeTagFilter = tagName; activeBrushSetFilter = null;
    updateActiveSidebarLink(); loadBrushesFromDBAndRender(); handleSidebarLinkClick();
}

function handleSearchInputChange() {
    loadBrushesFromDBAndRender();
}
function handleSortSelectChange() {
    loadBrushesFromDBAndRender();
}

let filesProcessed = 0;
async function handleFileInputChange(event) {
    const files = event.target.files;
    if (!files.length) return;
    const importButtonLabels = document.querySelectorAll('label[for="fileInput"].import-button, label[for="fileInput"].import-button-sidebar');


    if (IS_DEMO_MODE) {
        const currentBrushCount = await db.brushes.count();
        let estimatedNewBrushes = 0;
        for (const file of files) {
            estimatedNewBrushes += file.name.toLowerCase().endsWith('.brush') ? 1 : 5; // Crude estimate
        }
        if (currentBrushCount + estimatedNewBrushes > DEMO_BRUSH_LIMIT && files.length > 0) {
             const brushesInFirstFile = files[0].name.toLowerCase().endsWith('.brushset') ? 10 : 1; // Another crude estimate
             if (currentBrushCount + brushesInFirstFile > DEMO_BRUSH_LIMIT) {
                 alert(`Demo Version Limit: You can have up to ${DEMO_BRUSH_LIMIT} brushes. Please delete some or upgrade to the full version to import more.`);
                 if(fileInput) fileInput.value = "";
                 return;
            }
        }
    }

    let initialStatus = `Processing ${files.length} file(s)...`;
    updateStatus(initialStatus);
    let totalBrushesAdded = 0; filesProcessed = 0;
    if(fileInput) fileInput.disabled = true;
    importButtonLabels.forEach(label => label.classList.add('button-style-disabled'));


    for (const file of files) {
        let count = 0;
        try {
            if (IS_DEMO_MODE) {
                const currentBrushCount = await db.brushes.count();
                if (currentBrushCount >= DEMO_BRUSH_LIMIT) {
                    updateStatus(`Demo limit of ${DEMO_BRUSH_LIMIT} brushes reached. Skipping remaining files. Upgrade for unlimited.`, true);
                    break;
                }
            }

            if (file.name.toLowerCase().endsWith('.brushset')) count = await processBrushsetFile(file);
            else if (file.name.toLowerCase().endsWith('.brush')) count = await processBrushFile(file);
            else updateStatus(`Skipped unsupported file: ${file.name}`, true);
            totalBrushesAdded += count;
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            updateStatus(`Error with ${file.name}: ${error.message}. Trying next file.`, true);
        } finally {
            filesProcessed++;
            updateStatus(`Processed ${filesProcessed}/${files.length} files. Added ${totalBrushesAdded} new brushes so far...`);
        }
    }
    if(fileInput) fileInput.disabled = false;
    importButtonLabels.forEach(label => label.classList.remove('button-style-disabled'));
    if(fileInput) fileInput.value = "";

    let finalMessage = `Import complete. Added ${totalBrushesAdded} new brushes in total.`;
    if (IS_DEMO_MODE) {
        const finalBrushCount = await db.brushes.count();
        finalMessage += ` Total brushes in library: ${finalBrushCount} (Demo limit: ${DEMO_BRUSH_LIMIT}).`;
        if (finalBrushCount >= DEMO_BRUSH_LIMIT && totalBrushesAdded > 0 && filesProcessed < files.length) {
            finalMessage += " Some files may have been skipped due to the limit.";
        }
    }
    updateStatus(finalMessage);
    await loadBrushesFromDBAndRender();
}


async function handleClearDbButtonClick() {
    if (confirm("Are you sure you want to delete ALL brushes from your library? This is permanent.")) {
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
     handleSidebarLinkClick();
}

function handleMobileNavToggle() {
    toggleMobileSidebar();
}

function handlePageOverlayClick() {
    // If sidebar is open, close it
    if (sidebar && sidebar.classList.contains('open')) {
        toggleMobileSidebar(false);
    }
    // If mobile sort options are active, close them
    if (mobileSortOptions && mobileSortOptions.classList.contains('active')) {
        toggleMobileSort(false);
    }
    // If mobile search bar is active, close it
    if (mobileSearchBar && mobileSearchBar.classList.contains('active')) {
        toggleMobileSearch(false);
    }
    // If help modal is open, close it
    if (helpModal && helpModal.style.display === 'flex') {
        toggleHelpModal(false);
    }
}

function handleMobileSearchToggle() {
    toggleMobileSearch();
    if (mobileSearchBar && mobileSearchBar.classList.contains('active')) {
        if(mobileSearchInput) mobileSearchInput.focus();
    } else {
        if(mobileSearchInput && mobileSearchInput.value !== '') {
            mobileSearchInput.value = '';
            if(searchInput) searchInput.value = ''; 
            loadBrushesFromDBAndRender();
        }
    }
    updateSelectDeselectAllButtonsState();
}
function handleMobileSearchInput() {
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
        toggleMobileSort(false); 
    }
}

function handleMobileTagAction() {
    if (selectedBrushInternalIds.size === 0) {
        updateStatus("No brushes selected to tag.", true); return;
    }
    const tagsString = prompt(`Add tags (comma-separated) to ${selectedBrushInternalIds.size} selected brush(es):`);
    if (tagsString === null) return; 

    if(tagsToAddInput) tagsToAddInput.value = tagsString; 
    handleApplyTags(); 
    if(tagsToAddInput) tagsToAddInput.value = ''; 
}

function handleMobileEditAction() {
    if (selectedBrushInternalIds.size === 1) {
        const brushId = selectedBrushInternalIds.values().next().value;
        updateStatus(`Edit action for brush ID ${brushId} (Mobile). Full edit screen pending.`, false);
    } else {
        updateStatus("Select a single brush to edit.", true);
    }
}

function handleSelectAllVisible() {
    if (currentlyRenderedBrushes.length === 0) return;
    let changed = false;
    currentlyRenderedBrushes.forEach(brush => {
        if (!selectedBrushInternalIds.has(brush.internalId)) {
            selectedBrushInternalIds.add(brush.internalId);
            const card = document.querySelector(`.brush-card[data-internal-id="${brush.internalId}"]`);
            if (card) {
                card.classList.add('selected');
                const checkbox = card.querySelector(`#checkbox-${brush.internalId}`);
                if (checkbox) checkbox.checked = true;
            }
            changed = true;
        }
    });
    if (changed) {
        updateSelectedBrushActionsPanelContent();
        updateSelectDeselectAllButtonsState();
    }
}

function handleDeselectAll() {
    if (selectedBrushInternalIds.size === 0) return;
    selectedBrushInternalIds.clear();
    document.querySelectorAll('.brush-card.selected').forEach(card => {
        card.classList.remove('selected');
        const checkbox = card.querySelector('.item-checkbox.brush-select-checkbox'); 
        if (checkbox) checkbox.checked = false;
    });
    updateSelectedBrushActionsPanelContent();
    updateSelectDeselectAllButtonsState();
}

async function handleBackupLibrary() {
    console.warn("handleBackupLibrary called, but UI elements are removed.");
}

async function handleImportLibraryInputChange(event) {
    console.warn("handleImportLibraryInputChange called, but UI elements are removed.");
}

function handleHelpToggle() {
    toggleHelpModal();
}