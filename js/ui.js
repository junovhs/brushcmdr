// --- UI Update & Rendering Functions ---

function updateStatus(message, isError = false) {
    if (!outputDiv) { 
        console.warn("updateStatus called before outputDiv is available. Message:", message);
        return;
    }
    const statusMessageClass = isError ? 'status-message error-message' : 'status-message';
    const existingStatusP = outputDiv.querySelector('p.status-message');
    if (existingStatusP) {
        existingStatusP.remove();
    }
    const newStatusP = document.createElement('p');
    newStatusP.className = statusMessageClass;
    newStatusP.innerHTML = `<span class="info-label">${isError ? 'Error:' : 'Status:'}</span> ${message}`;
    const firstGridItemOrInfoText = outputDiv.querySelector('.brush-card, .info-text');
    if (firstGridItemOrInfoText) {
        outputDiv.insertBefore(newStatusP, firstGridItemOrInfoText);
    } else {
        outputDiv.appendChild(newStatusP);
    }
}

function resetUIStates() {
    if(searchInput) searchInput.value = '';
    if(mobileSearchInput) mobileSearchInput.value = '';
    if(sortSelect) sortSelect.value = 'name_asc';
    updateMobileSortUI('name_asc');

    selectedBrushInternalIds.clear();
    activeBrushSetFilter = null;
    activeTagFilter = null;
    currentViewMode = 'all';
    currentlyRenderedBrushes = [];


    document.querySelectorAll('.brush-card.selected').forEach(card => card.classList.remove('selected'));
    document.querySelectorAll('.brush-select-checkbox:checked').forEach(cb => cb.checked = false);

    if (sidebar && sidebar.classList.contains('open')) toggleMobileSidebar(false);
    if (mobileSearchBar && mobileSearchBar.classList.contains('active')) toggleMobileSearch(false);
    if (mobileSortOptions && mobileSortOptions.classList.contains('active')) toggleMobileSort(false);
    if (helpModal && helpModal.style.display !== 'none') toggleHelpModal(false); // Close help modal on reset


    updateActiveSidebarLink();
    updateSelectedBrushActionsPanelContent(); 
    loadBrushesFromDBAndRender(); 
}

function renderBrushLibrary(brushesToRender) {
    if (!outputDiv) return; 

    const existingStatusMessages = outputDiv.querySelectorAll('p.status-message');
    const existingInfoText = outputDiv.querySelectorAll('p.info-text');

    existingInfoText.forEach(msg => msg.remove());


    const existingCards = outputDiv.querySelectorAll('.brush-card');
    existingCards.forEach(card => card.remove());

    if (brushesToRender.length === 0) {
        existingStatusMessages.forEach(msg => msg.remove());
        let message = "No brushes found in your library. Import some to get started!";
        if (
            (searchInput && searchInput.value.trim()) ||
            (mobileSearchInput && mobileSearchInput.value.trim()) ||
            currentViewMode !== 'all' ||
            activeBrushSetFilter ||
            activeTagFilter
        ) {
            message = "No brushes match your current filters.";
        }
        const noBrushesP = document.createElement('p');
        noBrushesP.className = 'info-text';
        noBrushesP.textContent = message;
        outputDiv.appendChild(noBrushesP);
        return;
    }

    const oldInfoText = outputDiv.querySelector('.info-text');
    if(oldInfoText) oldInfoText.remove();


    const fragment = document.createDocumentFragment();
    const isMobileView = window.innerWidth <= 640;

    brushesToRender.forEach(b => {
        const card = document.createElement('div');
        card.className = 'brush-card';
        card.dataset.internalId = b.internalId;
        if (selectedBrushInternalIds.has(b.internalId)) {
            card.classList.add('selected');
        }

        const thumbUrl = b.thumbnailBlob ? URL.createObjectURL(b.thumbnailBlob) : "";
        const imgTag = thumbUrl ? `<img src="${thumbUrl}" alt="Preview for ${b.name}" loading="lazy">` : '<div class="no-preview">No Preview</div>';

        const isChecked = selectedBrushInternalIds.has(b.internalId);
        const favoriteStarInName = b.isFavorite ? '<span class="favorite-star">★</span>' : '';
        let nameDisplay = b.name;

        let fromSetHTML = '';
        let notesPreviewHTML = '';
        let tagsHTML = '';

        if (!isMobileView) {
            fromSetHTML = b.isFromSet && b.setName ? `<div class="from-set mobile-hidden">From: ${b.setName}</div>` : '';
            if (b.tags && b.tags.length > 0) {
                tagsHTML = `<div class="brush-tags-display-card mobile-hidden">` +
                           b.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join(' ') +
                           (b.tags.length > 3 ? ' ...' : '') +
                           `</div>`;
            }
            if (b.notes) {
                const truncatedNotes = b.notes.length > 60 ? b.notes.substring(0, 57) + "..." : b.notes;
                notesPreviewHTML = `<div class="notes-preview mobile-hidden">${truncatedNotes.replace(/\n/g, ' ')}</div>`;
            } else {
                notesPreviewHTML = `<div class="notes-preview mobile-hidden no-notes">No notes</div>`;
            }
        }

        card.innerHTML = `
            <input type="checkbox" class="item-checkbox brush-select-checkbox sr-only" data-internal-id="${b.internalId}" id="checkbox-${b.internalId}" ${isChecked ? 'checked' : ''}>
            <label for="checkbox-${b.internalId}" class="brush-preview-wrapper" aria-label="Select ${b.name}">
                ${imgTag}
            </label>
            <div class="brush-card-content">
                <div class="brush-card-info">
                    <div class="name">${nameDisplay}${favoriteStarInName}</div>
                    ${fromSetHTML}
                    ${notesPreviewHTML}
                    ${tagsHTML}
                </div>
                <div class="brush-card-actions">
                    <button class="icon-button favorite-icon ${b.isFavorite ? 'is-favorite' : ''}" data-action="toggle-favorite" title="${b.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>
                    </button>
                    <button class="icon-button delete-icon" data-action="delete" title="Delete brush">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6v18h18v-18h-18zm5 14c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm4-18v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"/></svg>
                    </button>
                </div>
            </div>
        `;
        card.addEventListener('click', (event) => handleCardClick(event, b.internalId));
        const checkbox = card.querySelector(`#checkbox-${b.internalId}`);
        if (checkbox) {
            checkbox.addEventListener('change', handleBrushSelectionChange);
        }

        card.querySelector('[data-action="toggle-favorite"]').addEventListener('click', (e) => { e.stopPropagation(); handleToggleFavorite(b.internalId); });
        card.querySelector('[data-action="delete"]').addEventListener('click', (e) => { e.stopPropagation(); handleDeleteSingleBrush(b.internalId); });

        fragment.appendChild(card);
    });
    outputDiv.appendChild(fragment);
}


async function populateBrushSetsSidebar() {
    if (!brushSetsListUL) return;
    try {
        const allBrushes = await db.brushes.toArray();
        const brushesFromSets = allBrushes.filter(b => b.isFromSet === true && b.setName);
        const setNames = new Set();
        brushesFromSets.forEach(b => setNames.add(b.setName));

        brushSetsListUL.innerHTML = '';

        if (setNames.size === 0) {
            const li = document.createElement('li');
            const importLabel = document.createElement('label');
            importLabel.htmlFor = 'fileInput';
            importLabel.className = 'import-button button-style import-button-sidebar';
            importLabel.textContent = 'Import First Brush Set';
            importLabel.style.display = 'block';
            importLabel.style.textAlign = 'center';
            importLabel.style.marginTop = '10px';
            li.appendChild(importLabel);
            brushSetsListUL.appendChild(li);
            const placeholderLi = document.createElement('li');
            placeholderLi.innerHTML = '<span class="no-items-placeholder" style="display:block; text-align:center; margin-top: 5px;">No sets imported yet</span>';
            brushSetsListUL.appendChild(placeholderLi);

        } else {
            const sortedSetNames = Array.from(setNames).sort((a,b) => a.localeCompare(b));
            sortedSetNames.forEach(setName => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#';
                a.textContent = setName;
                a.dataset.setName = setName;
                if (currentViewMode === 'set' && activeBrushSetFilter === setName) {
                    a.classList.add('active-link');
                }
                a.addEventListener('click', (e) => handleBrushSetFilterClick(e, setName));
                li.appendChild(a);
                brushSetsListUL.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error populating brush sets sidebar:", error);
        brushSetsListUL.innerHTML = '<li><span class="no-items-placeholder" style="color:var(--danger-color);">Error loading sets</span></li>';
    }
}

async function populateTagsSidebar() {
    if (!tagsListUL) return;
     try {
        const allBrushes = await db.brushes.toArray();
        const allTags = new Set();
        allBrushes.forEach(b => {
            if (b.tags) b.tags.forEach(tag => allTags.add(tag));
        });

        tagsListUL.innerHTML = ''; 
        const liUntagged = document.createElement('li');
        const aUntagged = document.createElement('a');
        aUntagged.href = '#';
        aUntagged.id = 'showUntaggedFilterLink'; 
        aUntagged.textContent = "Untagged";
         if (currentViewMode === 'tag' && activeTagFilter === 'UNTAGGED_FILTER') {
            aUntagged.classList.add('active-link');
        }
        aUntagged.addEventListener('click', handleUntaggedFilterClick);
        liUntagged.appendChild(aUntagged);
        tagsListUL.appendChild(liUntagged);

        const sortedTags = Array.from(allTags).sort((a,b) => a.localeCompare(b));
        if (sortedTags.length === 0 && allTags.size === 0) {
            // No user-created tags yet
        } else {
            sortedTags.forEach(tag => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#';
                a.textContent = tag;
                a.dataset.tagName = tag;
                if (currentViewMode === 'tag' && activeTagFilter === tag) {
                    a.classList.add('active-link');
                }
                a.addEventListener('click', (e) => handleTagFilterClick(e, tag));
                li.appendChild(a);
                tagsListUL.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error populating tags sidebar:", error);
        tagsListUL.innerHTML = '<li><span class="no-items-placeholder" style="color:var(--danger-color);">Error loading tags</span></li>';
    }
}

function updateActiveSidebarLink() {
    document.querySelectorAll('.sidebar-menu a.active-link').forEach(el => el.classList.remove('active-link'));
    if(brushSetsListUL) brushSetsListUL.querySelectorAll('a').forEach(el => el.classList.remove('active-link'));
    if(tagsListUL) tagsListUL.querySelectorAll('a').forEach(el => el.classList.remove('active-link'));

    if (currentViewMode === 'all' && allBrushesLink) allBrushesLink.classList.add('active-link');
    else if (currentViewMode === 'favorites' && favoritesLink) favoritesLink.classList.add('active-link');
    else if (currentViewMode === 'set' && activeBrushSetFilter && brushSetsListUL) {
        const setLink = brushSetsListUL.querySelector(`a[data-set-name="${CSS.escape(activeBrushSetFilter)}"]`);
        if (setLink) setLink.classList.add('active-link');
    } else if (currentViewMode === 'tag' && activeTagFilter && tagsListUL) {
        if (activeTagFilter === 'UNTAGGED_FILTER') {
            const untaggedLink = tagsListUL.querySelector('#showUntaggedFilterLink'); // Use ID
            if (untaggedLink) untaggedLink.classList.add('active-link');
        } else {
            const tagLink = tagsListUL.querySelector(`a[data-tag-name="${CSS.escape(activeTagFilter)}"]`);
            if (tagLink) tagLink.classList.add('active-link');
        }
    }
}

function updateMainContentTitle(count) {
    if (!mainContentTitleAppHeader) return;
    let title = "Brushes";
    if (currentViewMode === 'all') title = `All Brushes`;
    else if (currentViewMode === 'favorites') title = `Favorites`;
    else if (currentViewMode === 'set' && activeBrushSetFilter) title = `Set: ${activeBrushSetFilter}`;
    else if (currentViewMode === 'tag') {
        if (activeTagFilter === 'UNTAGGED_FILTER') title = `Untagged Brushes`;
        else if (activeTagFilter) title = `Tag: ${activeTagFilter}`;
    }
    mainContentTitleAppHeader.textContent = `${title} (${count !== undefined ? count : '...' })`.trim();
    mainContentTitleAppHeader.title = mainContentTitleAppHeader.textContent; 
}

function updateSelectedBrushActionsPanelContent() {
    const selectionSize = selectedBrushInternalIds.size;
    const isMobileView = window.innerWidth <= 640;

    if (selectedBrushActionsPanelContainer) {
        if (!isMobileView) {
            selectedBrushActionsPanelContainer.style.display = 'flex'; 
            if (selectionSize === 1) {
                const brushId = selectedBrushInternalIds.values().next().value;
                populateEditPanel(brushId);
                if(panelHeader) panelHeader.textContent = "Brush Details";
                if(singleBrushEditSection) singleBrushEditSection.style.display = 'block';
                if(multipleBrushesActionSection) multipleBrushesActionSection.style.display = 'block';
                updateCommonTagsDisplayForPanel();
                if(createNewSetButton) createNewSetButton.textContent = "Create .brushset from Selected";
            } else if (selectionSize > 1) {
                if(panelHeader) panelHeader.textContent = `${selectionSize} Brushes Selected`;
                if(singleBrushEditSection) singleBrushEditSection.style.display = 'none';
                if(multipleBrushesActionSection) multipleBrushesActionSection.style.display = 'block';
                updateCommonTagsDisplayForPanel();
                if(createNewSetButton) createNewSetButton.textContent = "Create .brushset from Selected";
            } else { 
                if(panelHeader) panelHeader.textContent = "Brush Actions";
                if(singleBrushEditSection) singleBrushEditSection.style.display = 'none';
                if(multipleBrushesActionSection) multipleBrushesActionSection.style.display = 'block'; 
                if(commonTagsDisplayDiv) commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder">No brushes selected for tagging.</span>';
                if(tagsToAddInput) tagsToAddInput.value = '';
                if(createNewSetButton) createNewSetButton.textContent = currentlyRenderedBrushes.length > 0 ? `Export ${currentlyRenderedBrushes.length} Brushes in View as .brushset` : "Create .brushset from Selected";
            }
            if(createNewSetButton) createNewSetButton.disabled = (selectionSize === 0 && currentlyRenderedBrushes.length === 0 && !(IS_DEMO_MODE && createNewSetButton.classList.contains('button-style-disabled'))) || (IS_DEMO_MODE && createNewSetButton.classList.contains('button-style-disabled'));


        } else {
            selectedBrushActionsPanelContainer.style.display = 'none';
        }
    }

    if (deleteSelectedButtonFixed) {
        if (selectionSize > 0) {
            deleteSelectedButtonFixed.style.display = 'inline-block';
            deleteSelectedButtonFixed.textContent = `Delete ${selectionSize} Selected`;
            deleteSelectedButtonFixed.disabled = false;
        } else {
            deleteSelectedButtonFixed.style.display = 'none';
            deleteSelectedButtonFixed.disabled = true;
        }
    }


    if (mobileBottomActionBar) {
        if (isMobileView && selectionSize > 0) {
            mobileBottomActionBar.classList.add('active');
            if(mobileSelectedCount) mobileSelectedCount.textContent = `${selectionSize} selected`;
            if(mobileEditButton) mobileEditButton.style.display = selectionSize === 1 ? 'inline-block' : 'none';
            if(mobileDeleteButton) mobileDeleteButton.style.display = 'inline-block';
        } else {
            mobileBottomActionBar.classList.remove('active');
            if(mobileDeleteButton) mobileDeleteButton.style.display = 'none';
        }
    }
    updateSelectDeselectAllButtonsState();
}

async function populateEditPanel(brushId) {
    if (!singleBrushEditSection || !brushNameInput || !brushNotesTextarea || !brushIsFavoriteCheckbox || !archiveInsightsContent) return;
    try {
        const brush = await db.brushes.get(brushId);
        if (brush) {
            brushNameInput.value = brush.name;
            brushNotesTextarea.value = brush.notes || "";
            brushIsFavoriteCheckbox.checked = brush.isFavorite || false;
            if(archiveInsightsContent) archiveInsightsContent.textContent = brush.brushArchiveBlob ? "Brush.archive available." : "Brush.archive data not found.";
        } else {
            brushNameInput.value = "";
            brushNotesTextarea.value = "";
            brushIsFavoriteCheckbox.checked = false;
            if(archiveInsightsContent) archiveInsightsContent.textContent = "Selected brush not found.";
            if(panelHeader) panelHeader.textContent = "Error";
        }
    } catch (e) {
        console.error("Error fetching brush for edit panel:", e);
        if(archiveInsightsContent) archiveInsightsContent.textContent = "Error fetching brush details.";
        if(panelHeader) panelHeader.textContent = "Error";
        brushNameInput.value = "";
        brushNotesTextarea.value = "";
        brushIsFavoriteCheckbox.checked = false;
    }
}

async function updateCommonTagsDisplayForPanel() {
    if (!commonTagsDisplayDiv) return;
    commonTagsDisplayDiv.innerHTML = '';
    if (selectedBrushInternalIds.size === 0) {
        commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder">No brushes selected for tagging.</span>';
        return;
    }
    try {
        const brushes = await db.brushes.bulkGet(Array.from(selectedBrushInternalIds));
        let commonTags = new Set();
        let firstBrush = true;

        brushes.forEach(brush => {
            if (brush && brush.tags) {
                const brushTags = new Set(brush.tags.map(t => t.toUpperCase()));
                if (firstBrush) {
                    commonTags = brushTags;
                    firstBrush = false;
                } else {
                    commonTags = new Set([...commonTags].filter(tag => brushTags.has(tag)));
                }
            } else { 
                commonTags.clear();
                firstBrush = false; 
            }
        });

        if (commonTags.size === 0 && selectedBrushInternalIds.size > 0) {
            commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder">Selected brushes have no tags in common.</span>';
        } else if (commonTags.size > 0) {
            Array.from(commonTags).sort().forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag-in-manager';
                tagElement.textContent = tag;
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-tag-btn';
                removeBtn.innerHTML = '×';
                removeBtn.title = `Remove tag "${tag}" from selected`;
                removeBtn.dataset.tagName = tag;
                removeBtn.addEventListener('click', handleRemoveTagFromSelected);
                tagElement.appendChild(removeBtn);
                commonTagsDisplayDiv.appendChild(tagElement);
            });
        } else { 
             commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder">No brushes selected or no common tags.</span>';
        }
    } catch (e) {
        console.error("Error updating common tags display:", e);
        commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder" style="color:var(--danger-color)">Error loading tags.</span>';
    }
}

function openEditPanelForBrush(brushId) {
    const isMobileView = window.innerWidth <= 640;

    document.querySelectorAll('.brush-card.selected').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.brush-select-checkbox:checked').forEach(cb => cb.checked = false);
    selectedBrushInternalIds.clear();
    selectedBrushInternalIds.add(brushId);

    const cardToSelect = outputDiv.querySelector(`.brush-card[data-internal-id="${brushId}"]`);
    if (cardToSelect) {
        cardToSelect.classList.add('selected');
        const checkbox = cardToSelect.querySelector('.brush-select-checkbox');
        if(checkbox) checkbox.checked = true;
    }

    updateSelectedBrushActionsPanelContent(); 

    if (isMobileView) {
        if(mobileEditButton) mobileEditButton.style.display = 'inline-block';
    } else {
        if(selectedBrushActionsPanelContainer) selectedBrushActionsPanelContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if(brushNameInput) brushNameInput.focus();
    }
}

function toggleMobileSidebar(forceOpen = null) {
    if (!sidebar || !pageOverlay || !mobileNavToggle) return;
    const isOpen = sidebar.classList.contains('open');
    if (forceOpen === true || (forceOpen === null && !isOpen)) {
        sidebar.classList.add('open');
        pageOverlay.classList.add('active'); // Show overlay
        mobileNavToggle.innerHTML = '<span class="icon-close"></span>';
    } else if (forceOpen === false || (forceOpen === null && isOpen)) {
        sidebar.classList.remove('open');
        // Only hide overlay if help modal isn't also using it
        if (!helpModal || helpModal.style.display === 'none') {
            pageOverlay.classList.remove('active');
        }
        mobileNavToggle.innerHTML = '<span class="icon-menu"></span>';
    }
}

function toggleMobileSearch(forceOpen = null) {
    if (!mobileSearchBar || !contentHeader) return; 
    const isActive = mobileSearchBar.classList.contains('active');
    const appHeaderTitle = document.getElementById('mainContentTitleAppHeader'); 


    if (forceOpen === true || (forceOpen === null && !isActive)) {
        mobileSearchBar.classList.add('active');
        if(appHeaderTitle) appHeaderTitle.style.display = 'none'; 
        if(desktopContentActions) desktopContentActions.style.display = 'none';
        if(mobileTitleActionsContainer) mobileTitleActionsContainer.style.display = 'none';
        contentHeader.classList.add('mobile-search-active');
        if(mobileSearchInput) mobileSearchInput.focus();
    } else if (forceOpen === false || (forceOpen === null && isActive)) {
        mobileSearchBar.classList.remove('active');
        // On mobile, mainContentTitleAppHeader is generally hidden, so no need to show it here explicitly
        // It will be shown/hidden by the resize listener
        
        if(desktopContentActions && window.innerWidth > 640) desktopContentActions.style.display = 'flex';
        if(mobileTitleActionsContainer && window.innerWidth <= 640 && currentlyRenderedBrushes.length > 0) mobileTitleActionsContainer.style.display = 'flex';
        contentHeader.classList.remove('mobile-search-active');
    }
}

function toggleMobileSort(forceOpen = null) {
    if (!mobileSortOptions || !sortSelect) return;
    const isActive = mobileSortOptions.classList.contains('active');
    if (forceOpen === true || (forceOpen === null && !isActive)) {
        mobileSortOptions.classList.add('active');
        pageOverlay.classList.add('active'); // Use overlay
        const currentSortValue = sortSelect.value;
        mobileSortOptions.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active-sort', btn.dataset.sort === currentSortValue);
        });
    } else if (forceOpen === false || (forceOpen === null && isActive)) {
        mobileSortOptions.classList.remove('active');
        // Only hide overlay if other elements aren't using it
        if ((!sidebar || !sidebar.classList.contains('open')) && (!helpModal || helpModal.style.display === 'none')) {
            pageOverlay.classList.remove('active');
        }
    }
}

function updateMobileSortUI(sortValue) {
    if (mobileSortOptions) {
        mobileSortOptions.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active-sort', btn.dataset.sort === sortValue);
        });
    }
    if(sortSelect) sortSelect.value = sortValue;
}

function toggleHelpModal(forceOpen = null) {
    if (!helpModal || !pageOverlay) return;
    const isOpen = helpModal.style.display === 'flex';

    if (forceOpen === true || (forceOpen === null && !isOpen)) {
        helpModal.style.display = 'flex';
        pageOverlay.classList.add('active'); 
    } else if (forceOpen === false || (forceOpen === null && isOpen)) {
        helpModal.style.display = 'none';
        // Only hide overlay if other elements (sidebar, mobile sort) aren't also using it
        if ((!sidebar || !sidebar.classList.contains('open')) && (!mobileSortOptions || !mobileSortOptions.classList.contains('active'))) {
            pageOverlay.classList.remove('active');
        }
    }
}


window.addEventListener('resize', () => {
    updateSelectedBrushActionsPanelContent();
    const appHeaderTitle = document.getElementById('mainContentTitleAppHeader');

    if (window.innerWidth > 640) {
        if (sidebar && sidebar.classList.contains('open')) toggleMobileSidebar(false);
        if (mobileSearchBar && mobileSearchBar.classList.contains('active')) toggleMobileSearch(false);
        if (mobileSortOptions && mobileSortOptions.classList.contains('active')) toggleMobileSort(false);
        if (appHeaderTitle) appHeaderTitle.style.display = ''; 
    } else {
         if (selectedBrushActionsPanelContainer && selectedBrushActionsPanelContainer.style.display !== 'none') {
            selectedBrushActionsPanelContainer.style.display = 'none';
        }
        if (appHeaderTitle) appHeaderTitle.style.display = 'none'; 
    }
    createHeaderActionButtons(); 
    updateSelectDeselectAllButtonsState();
});

function createHeaderActionButtons() {
    if (selectAllButtonDesktop && selectAllButtonDesktop.parentElement) selectAllButtonDesktop.remove();
    if (deselectAllButtonDesktop && deselectAllButtonDesktop.parentElement) deselectAllButtonDesktop.remove();
    if (selectAllButtonMobile && selectAllButtonMobile.parentElement) selectAllButtonMobile.remove();
    if (deselectAllButtonMobile && deselectAllButtonMobile.parentElement) deselectAllButtonMobile.remove();

    if (desktopContentActions && !document.getElementById('selectAllButtonDesktop')) {
        selectAllButtonDesktop = document.createElement('button');
        selectAllButtonDesktop.id = 'selectAllButtonDesktop';
        selectAllButtonDesktop.className = 'button-style accent-button'; 
        selectAllButtonDesktop.innerHTML = '<span class="icon-select-all"></span> <span class="button-text">Select All</span>';
        selectAllButtonDesktop.title = "Select all visible brushes";
        selectAllButtonDesktop.addEventListener('click', handleSelectAllVisible);
        desktopContentActions.insertBefore(selectAllButtonDesktop, desktopContentActions.firstChild);

        deselectAllButtonDesktop = document.createElement('button');
        deselectAllButtonDesktop.id = 'deselectAllButtonDesktop';
        deselectAllButtonDesktop.className = 'button-style accent-button'; 
        deselectAllButtonDesktop.innerHTML = '<span class="icon-deselect-all"></span> <span class="button-text">Deselect All</span>';
        deselectAllButtonDesktop.title = "Deselect all brushes";
        deselectAllButtonDesktop.addEventListener('click', handleDeselectAll);
        if (selectAllButtonDesktop.nextSibling) {
            desktopContentActions.insertBefore(deselectAllButtonDesktop, selectAllButtonDesktop.nextSibling);
        } else {
            desktopContentActions.appendChild(deselectAllButtonDesktop);
        }
    }

    if (mobileTitleActionsContainer && !document.getElementById('selectAllButtonMobile')) {
        mobileTitleActionsContainer.innerHTML = ''; 

        selectAllButtonMobile = document.createElement('button');
        selectAllButtonMobile.id = 'selectAllButtonMobile';
        selectAllButtonMobile.className = 'button-style accent-button mobile-header-action'; 
        selectAllButtonMobile.innerHTML = '<span class="icon-select-all"></span><span class="button-text sr-only">Select All</span>';
        selectAllButtonMobile.title = "Select all visible brushes";
        selectAllButtonMobile.addEventListener('click', handleSelectAllVisible);
        mobileTitleActionsContainer.appendChild(selectAllButtonMobile);

        deselectAllButtonMobile = document.createElement('button');
        deselectAllButtonMobile.id = 'deselectAllButtonMobile';
        deselectAllButtonMobile.className = 'button-style accent-button mobile-header-action'; 
        deselectAllButtonMobile.innerHTML = '<span class="icon-deselect-all"></span><span class="button-text sr-only">Deselect All</span>';
        deselectAllButtonMobile.title = "Deselect all brushes";
        deselectAllButtonMobile.addEventListener('click', handleDeselectAll);
        mobileTitleActionsContainer.appendChild(deselectAllButtonMobile);
    }
    updateSelectDeselectAllButtonsState();
}

function updateSelectDeselectAllButtonsState() {
    const hasBrushesInView = currentlyRenderedBrushes.length > 0;
    const hasSelections = selectedBrushInternalIds.size > 0;
    const allVisibleSelected = hasBrushesInView && currentlyRenderedBrushes.every(brush => selectedBrushInternalIds.has(brush.internalId));

    const isMobile = window.innerWidth <= 640;
    const isMobileSearchActive = mobileSearchBar && mobileSearchBar.classList.contains('active');


    if (selectAllButtonDesktop) {
        selectAllButtonDesktop.disabled = !hasBrushesInView || allVisibleSelected;
        selectAllButtonDesktop.style.display = (!isMobile) ? 'inline-block' : 'none';
    }
    if (deselectAllButtonDesktop) {
        deselectAllButtonDesktop.disabled = !hasSelections;
        deselectAllButtonDesktop.style.display = (!isMobile) ? 'inline-block' : 'none';
    }

    if (selectAllButtonMobile) {
        selectAllButtonMobile.disabled = !hasBrushesInView || allVisibleSelected;
        selectAllButtonMobile.style.display = (isMobile && hasBrushesInView && !isMobileSearchActive && contentHeader && contentHeader.style.display !== 'none') ? 'inline-block' : 'none';
    }
    if (deselectAllButtonMobile) {
        deselectAllButtonMobile.disabled = !hasSelections;
        deselectAllButtonMobile.style.display = (isMobile && hasBrushesInView && !isMobileSearchActive && contentHeader && contentHeader.style.display !== 'none') ? 'inline-block' : 'none';
    }

    if (mobileTitleActionsContainer) {
        const showMobileActions = isMobile && hasBrushesInView && !isMobileSearchActive && contentHeader && contentHeader.style.display !== 'none';
        mobileTitleActionsContainer.style.display = showMobileActions ? 'flex' : 'none';
    }

    if (desktopContentActions) {
         desktopContentActions.style.display = (!isMobile) ? 'flex' : 'none';
    }
}