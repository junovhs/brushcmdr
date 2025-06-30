// --- Event Handler Functions for Brush Selection ---

function handleCardClick(event, brushId) {
    // If the click is on a button inside the card, don't trigger selection.
    if (event.target.closest('.icon-button')) {
        return;
    }

    const checkbox = document.getElementById(`checkbox-${brushId}`);
    if (checkbox) {
        // Programmatically click the checkbox unless the click was on the checkbox itself
        // or its label, which would cause a double-trigger.
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

    // Update the UI based on the new selection state
    updateSelectedBrushActionsPanelContent();

    // If only one brush is selected on desktop, populate the edit panel
    if (selectedBrushInternalIds.size === 1 && window.innerWidth > 640) {
        const singleSelectedId = selectedBrushInternalIds.values().next().value;
        populateEditPanel(singleSelectedId);
    }
    
    updateSelectDeselectAllButtonsState();
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