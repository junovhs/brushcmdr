// --- Event Handlers for Direct Brush Actions (Save, Delete, Tag) ---

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
            selectedBrushInternalIds.delete(brushId);
            updateStatus(`Brush "${brush.name}" deleted.`);
            await loadBrushesFromDBAndRender();
        } catch (e) {
            console.error("Error deleting brush:", e);
            updateStatus("Error deleting brush.", true);
        }
    }
}

async function handleDeleteSelectedBrushes() {
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
            await loadBrushesFromDBAndRender();
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
        }
    } catch (e) {
        console.error("Error removing tag:", e);
        updateStatus(`Error removing tag "${tagToRemove}".`, true);
    }
}

// --- NEW HANDLERS FOR LIBRARY-WIDE DELETION ---

async function handleDeleteTagFromLibrary(tagName) {
    if (!tagName) return;

    if (!confirm(`Are you sure you want to remove the tag "${tagName}" from ALL brushes in your library? This cannot be undone.`)) {
        return;
    }

    try {
        // Find all brushes that have this tag.
        const brushesWithTag = await db.brushes.filter(b => b.tags && b.tags.includes(tagName)).toArray();
        if (brushesWithTag.length === 0) {
            updateStatus(`No brushes found with the tag "${tagName}".`, true);
            return;
        }

        // For each brush, remove the tag from its tags array.
        const updates = brushesWithTag.map(brush => {
            brush.tags = brush.tags.filter(t => t !== tagName);
            return brush;
        });

        // Bulk update the modified brushes.
        await db.brushes.bulkPut(updates);

        updateStatus(`Tag "${tagName}" removed from ${updates.length} brushes.`);
        // If the deleted tag was active, clear it.
        if (activeTagFilter.has(tagName)) {
            activeTagFilter.delete(tagName);
            if(activeTagFilter.size === 0) currentViewMode = 'all';
        }
        await loadBrushesFromDBAndRender();

    } catch (e) {
        console.error("Error removing tag from library:", e);
        updateStatus(`Error removing tag "${tagName}".`, true);
    }
}

async function handleDeleteBrushSetFromLibrary(setName) {
    if (!setName) return;

    try {
        // First, find how many brushes are in the set for the confirmation message.
        const brushesInSet = await db.brushes.where('setName').equals(setName).toArray();
        const count = brushesInSet.length;

        if (count === 0) {
            updateStatus(`No brushes found in the set "${setName}" to delete.`, true);
            // This might happen if data is inconsistent. We should refresh to clean up the UI.
            await loadBrushesFromDBAndRender();
            return;
        }

        if (!confirm(`Are you sure you want to delete the entire "${setName}" set? This will permanently delete all ${count} brushes from this set.`)) {
            return;
        }

        // If confirmed, get the IDs and bulk delete.
        const idsToDelete = brushesInSet.map(b => b.internalId);
        await db.brushes.bulkDelete(idsToDelete);

        updateStatus(`Successfully deleted the "${setName}" set and its ${count} brushes.`);

        // If the user was viewing the set they just deleted, reset the view.
        if (currentViewMode === 'set' && activeBrushSetFilter === setName) {
            currentViewMode = 'all';
            activeBrushSetFilter = null;
        }
        await loadBrushesFromDBAndRender();

    } catch (e) {
        console.error("Error deleting brush set:", e);
        updateStatus(`Error deleting brush set "${setName}".`, true);
    }
}