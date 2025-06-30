// --- DATABASE SETUP (Dexie.js) ---
const db = new Dexie("ProcreateBrushManagerDB");

// V8 Schema: Added authorName index for creator filtering and display.
db.version(8).stores({
    brushes: `++internalId, [uuid+sourceFileName], uuid, name, dateAdded, isFavorite, thumbnailBlob, sourceFileName, isFromSet, setName, *tags, notes, brushArchiveBlob, shapeBlob, grainBlob, authorName`,
    userCollections: `++id, name, dateCreated, *brushInternalIds`
});

// V7 Schema (Previous): Kept for reference of the upgrade path.
db.version(7).stores({
    brushes: `++internalId, [uuid+sourceFileName], uuid, name, dateAdded, isFavorite, thumbnailBlob, sourceFileName, isFromSet, setName, *tags, notes, brushArchiveBlob, shapeBlob, grainBlob`,
    userCollections: `++id, name, dateCreated, *brushInternalIds`
});


// --- DATA MODELS / CONSTRUCTORS ---
function BrushInfo(uuid, name, thumbnailBlob, sourceFileName, isFromSet = false, setName = null, authorName = "Unknown") {
    this.uuid = uuid || `brush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = name || "Untitled Brush";
    this.dateAdded = new Date();
    this.isFavorite = false;
    this.thumbnailBlob = thumbnailBlob;
    this.sourceFileName = sourceFileName;
    this.isFromSet = isFromSet;
    this.setName = setName;
    this.authorName = authorName;
    this.tags = [];
    this.notes = "";
    this.brushArchiveBlob = null;
    this.shapeBlob = null;
    this.grainBlob = null;
}

function UserCollectionInfo(name) {
    this.name = name;
    this.brushInternalIds = [];
    this.dateCreated = new Date();
}

// --- CORE DB OPERATIONS ---
async function saveBrushToDB(brushData) {
    try {
        if (!brushData.dateAdded) brushData.dateAdded = new Date();
        const existing = await db.brushes.where({ uuid: brushData.uuid, sourceFileName: brushData.sourceFileName }).first();
        if (existing) {
            console.log(`Brush "${brushData.name}" (UUID: ${brushData.uuid}) from "${brushData.sourceFileName}" already in DB. Skipping.`);
            return existing.internalId;
        }
        return await db.brushes.add(brushData);
    } catch (error) {
        console.error("Error saving brush:", brushData.name, error);
        if (updateStatus) {
            updateStatus(`Error saving brush "${brushData.name}" to DB. Possible duplicate or other issue.`, true);
        }
        return null;
    }
}

async function loadBrushesFromDBAndRender() {
    try {
        const searchTerm = (searchInput && searchInput.value || mobileSearchInput && mobileSearchInput.value || '').toLowerCase().trim();
        const favoritesOnly = currentViewMode === 'favorites';
        
        let query = db.brushes;

        if (activeTagFilter.size > 0) {
            const tags = Array.from(activeTagFilter);
            if (tags.includes('UNTAGGED_FILTER')) {
                query = query.filter(brush => !brush.tags || brush.tags.length === 0);
            } else {
                query = query.filter(brush => {
                    const brushTags = brush.tags || [];
                    return tags.every(filterTag => brushTags.includes(filterTag));
                });
            }
        }

        let filteredBrushes = await query.toArray();

        filteredBrushes = filteredBrushes.filter(brush => {
            let matchesSearch = !searchTerm || (
                (brush.name && brush.name.toLowerCase().includes(searchTerm)) ||
                (brush.authorName && brush.authorName.toLowerCase().includes(searchTerm)) ||
                (brush.setName && brush.setName.toLowerCase().includes(searchTerm)) ||
                (brush.sourceFileName && brush.sourceFileName.toLowerCase().includes(searchTerm)) ||
                (brush.uuid && brush.uuid.toLowerCase().includes(searchTerm)) ||
                (brush.tags && brush.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );

            let matchesFavorite = !favoritesOnly || brush.isFavorite;
            let matchesBrushSet = !activeBrushSetFilter || (brush.isFromSet && brush.setName === activeBrushSetFilter);

            if (currentViewMode === 'favorites') return matchesFavorite && matchesSearch && matchesBrushSet;
            if (currentViewMode === 'set') return matchesBrushSet && matchesSearch && matchesFavorite;
            
            return matchesSearch && matchesFavorite && matchesBrushSet;
        });

        const currentSort = sortSelect ? sortSelect.value : 'name_asc';
        filteredBrushes.sort((a, b) => {
            switch (currentSort) {
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'date_desc': return (new Date(b.dateAdded).getTime() || 0) - (new Date(a.dateAdded).getTime() || 0);
                case 'date_asc': return (new Date(a.dateAdded).getTime() || 0) - (new Date(b.dateAdded).getTime() || 0);
                case 'set_asc':
                    const sa = a.isFromSet && a.setName ? a.setName : "\uffff";
                    const sb = b.isFromSet && b.setName ? b.setName : "\uffff";
                    return sa.localeCompare(sb);
                case 'set_desc':
                    const sda = a.isFromSet && a.setName ? a.setName : "";
                    const sdb = b.isFromSet && b.setName ? b.setName : "";
                    return sdb.localeCompare(sda);
                default: return a.name.localeCompare(b.name);
            }
        });

        currentlyRenderedBrushes = filteredBrushes;
        
        renderBrushLibrary(filteredBrushes);
        updateSelectedBrushActionsPanelContent();

        // The following functions dynamically create the sidebar links.
        await populateBrushSetsSidebar();
        await populateTagsSidebar();
        
        // ** THE FINAL FIX **
        // After the links are created, we MUST call updateActiveSidebarLink again
        // to apply the highlight based on the current state.
        updateActiveSidebarLink();
        updateMainContentTitle(filteredBrushes.length);
        updateSelectDeselectAllButtonsState();

    } catch (error) {
        console.error("Error loading brushes:", error);
        if (updateStatus) {
            updateStatus("Error loading brushes from the database.", true);
        }
        currentlyRenderedBrushes = [];
        await populateBrushSetsSidebar();
        await populateTagsSidebar();
        updateActiveSidebarLink(); // Also call on error to reset UI
        updateSelectDeselectAllButtonsState();
    }
}