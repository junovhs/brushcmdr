// --- UI Functions for the Right-Hand Actions Panel ---

function updateSelectedBrushActionsPanelContent() {
    const selectionSize = selectedBrushInternalIds.size;
    const isMobileView = window.innerWidth <= 640;

    // --- Desktop Panel Logic ---
    if (selectedBrushActionsPanelContainer) {
        if (!isMobileView) {
            selectedBrushActionsPanelContainer.style.display = 'flex'; 
            
            if (selectionSize === 1) {
                // Single item selected: Show full edit form
                const brushId = selectedBrushInternalIds.values().next().value;
                populateEditPanel(brushId);
                if(panelHeader) panelHeader.textContent = "Brush Details";
                if(singleBrushEditSection) singleBrushEditSection.style.display = 'block';
                if(multipleBrushesActionSection) multipleBrushesActionSection.style.display = 'block';
                updateCommonTagsDisplayForPanel();
                if(createNewSetButton) createNewSetButton.textContent = "Create .brushset from Selected";

            } else if (selectionSize > 1) {
                // Multiple items selected: Show only multi-edit actions
                if(panelHeader) panelHeader.textContent = `${selectionSize} Brushes Selected`;
                if(singleBrushEditSection) singleBrushEditSection.style.display = 'none';
                if(multipleBrushesActionSection) multipleBrushesActionSection.style.display = 'block';
                updateCommonTagsDisplayForPanel();
                if(createNewSetButton) createNewSetButton.textContent = "Create .brushset from Selected";

            } else { 
                // Nothing selected: Show general actions
                if(panelHeader) panelHeader.textContent = "Brush Actions";
                if(singleBrushEditSection) singleBrushEditSection.style.display = 'none';
                if(multipleBrushesActionSection) multipleBrushesActionSection.style.display = 'block'; 
                if(commonTagsDisplayDiv) commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder">Select brushes to manage tags.</span>';
                if(tagsToAddInput) tagsToAddInput.value = '';
                if(createNewSetButton) createNewSetButton.textContent = currentlyRenderedBrushes.length > 0 ? `Export View as .brushset` : "Create .brushset";
            }
            if(createNewSetButton) createNewSetButton.disabled = (selectionSize === 0 && currentlyRenderedBrushes.length === 0);

        } else {
            selectedBrushActionsPanelContainer.style.display = 'none';
        }
    }

    // --- Panel "Delete Selected" Button Logic ---
    // This now references the button inside the panel, not the old fixed one.
    if (deleteSelectedButton) {
        if (selectionSize > 0) {
            deleteSelectedButton.style.display = 'inline-block';
            deleteSelectedButton.textContent = `Delete ${selectionSize} Selected`;
            deleteSelectedButton.disabled = false;
        } else {
            deleteSelectedButton.style.display = 'none';
            deleteSelectedButton.disabled = true;
        }
    }
    
    // The mobile bar was removed, so no logic is needed here.

    updateSelectDeselectAllButtonsState();
}

async function populateEditPanel(brushId) {
    if (!singleBrushEditSection || !brushNameInput || !brushNotesTextarea || !brushIsFavoriteCheckbox) return;
    try {
        const brush = await db.brushes.get(brushId);
        if (brush) {
            brushNameInput.value = brush.name;
            brushNotesTextarea.value = brush.notes || "";
            brushIsFavoriteCheckbox.checked = brush.isFavorite || false;
        } else {
            // Clear panel if brush not found
            brushNameInput.value = "";
            brushNotesTextarea.value = "";
            brushIsFavoriteCheckbox.checked = false;
        }
    } catch (e) {
        console.error("Error fetching brush for edit panel:", e);
        brushNameInput.value = "";
        brushNotesTextarea.value = "";
        brushIsFavoriteCheckbox.checked = false;
    }
}

async function updateCommonTagsDisplayForPanel() {
    if (!commonTagsDisplayDiv) return;

    if (selectedBrushInternalIds.size === 0) {
        commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder">Select brushes to manage tags.</span>';
        return;
    }

    commonTagsDisplayDiv.innerHTML = ''; // Clear previous tags
    try {
        const brushes = await db.brushes.bulkGet(Array.from(selectedBrushInternalIds));
        
        let commonTags = new Set();
        let firstBrush = true;
        for (const brush of brushes) {
            if (!brush) continue;
            const brushTags = new Set((brush.tags || []).map(t => t.toUpperCase()));
            if (firstBrush) {
                commonTags = brushTags;
                firstBrush = false;
            } else {
                commonTags = new Set([...commonTags].filter(tag => brushTags.has(tag)));
            }
        }

        if (commonTags.size === 0) {
            commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder">No common tags in selection.</span>';
        } else {
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
        }
    } catch (e) {
        console.error("Error updating common tags display:", e);
        commonTagsDisplayDiv.innerHTML = '<span class="no-items-placeholder" style="color:var(--danger-color)">Error loading tags.</span>';
    }
}