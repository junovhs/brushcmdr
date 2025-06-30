// ===== START OF FILE: brushvault/js/handlers/dataHandlers.js ===== //
// --- Event Handlers for Data Import and Export ---

// --- Helper functions for Blob/Base64 conversion ---
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            // Returns a Base64 data URL string
            resolve(reader.result);
        };
        reader.readAsDataURL(blob);
    });
}

async function base64ToBlob(base64) {
    // Handles the "data:mime/type;base64," prefix
    const res = await fetch(base64);
    return await res.blob();
}

// --- V1 BACKUP/RESTORE: Rewritten for sequential, robust streaming ---
async function handleBackupLibraryClick() {
    updateStatus("Initializing secure backup stream...");
    if (typeof streamSaver === 'undefined') {
        updateStatus("Critical Error: StreamSaver library not found. Backup failed.", true);
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const fileName = `brush-commander-backup-${timestamp}.brushvault`;
    const fileStream = streamSaver.createWriteStream(fileName);
    const writer = fileStream.getWriter();
    const encoder = new TextEncoder();

    try {
        const metadata = { schemaVersion: DB_SCHEMA_VERSION, type: 'BrushCommanderBackup' };
        await writer.write(encoder.encode(JSON.stringify(metadata) + '\n'));

        const allBrushes = await db.brushes.toArray();
        let brushesCount = 0;

        for (const brush of allBrushes) {
            const serializableBrush = { ...brush };
            
            if (serializableBrush.thumbnailBlob instanceof Blob) serializableBrush.thumbnailBlob = await blobToBase64(serializableBrush.thumbnailBlob);
            if (serializableBrush.brushArchiveBlob instanceof Blob) serializableBrush.brushArchiveBlob = await blobToBase64(serializableBrush.brushArchiveBlob);
            if (serializableBrush.shapeBlob instanceof Blob) serializableBrush.shapeBlob = await blobToBase64(serializableBrush.shapeBlob);
            if (serializableBrush.grainBlob instanceof Blob) serializableBrush.grainBlob = await blobToBase64(serializableBrush.grainBlob);

            const line = JSON.stringify({ table: 'brushes', data: serializableBrush });
            await writer.write(encoder.encode(line + '\n'));
            brushesCount++;
            
            if (brushesCount > 0 && brushesCount % 20 === 0) {
                updateStatus(`Streaming backup... ${brushesCount} brushes processed.`);
            }
        }
        
        await writer.close();
        updateStatus(`Secure streaming backup complete. ${brushesCount} brushes saved to ${fileName}.`);

    } catch (error) {
        console.error("Error during streaming backup:", error);
        updateStatus(`Backup failed due to a stream error: ${error.message}`, true);
        await writer.abort(error).catch(e => console.error("Error aborting stream:", e));
    }
}


async function handleRestoreLibraryChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    updateStatus("Validating backup file...");
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
        updateStatus("Validation failed: Backup file is empty.", true);
        if(restoreLibraryInput) restoreLibraryInput.value = "";
        return;
    }

    let metadata;
    try {
        metadata = JSON.parse(lines[0]);
        if (!metadata.schemaVersion || metadata.schemaVersion > DB_SCHEMA_VERSION) {
            throw new Error("Invalid or incompatible schema version.");
        }
    } catch (e) {
        updateStatus("Validation failed: This is not a valid Brush Commander backup file. Your library was not changed.", true);
        if(restoreLibraryInput) restoreLibraryInput.value = "";
        return;
    }
    
    updateStatus("Validation successful. Preparing to restore library...");

    try {
        const recordsToImport = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const record = JSON.parse(line);
            const { table, data } = record;
            if (table !== 'brushes') continue;

            if (data.thumbnailBlob) data.thumbnailBlob = await base64ToBlob(data.thumbnailBlob);
            if (data.brushArchiveBlob) data.brushArchiveBlob = await base64ToBlob(data.brushArchiveBlob);
            if (data.shapeBlob) data.shapeBlob = await base64ToBlob(data.shapeBlob);
            if (data.grainBlob) data.grainBlob = await base64ToBlob(data.grainBlob);
            if (data.dateAdded) data.dateAdded = new Date(data.dateAdded);
            
            delete data.internalId;
            recordsToImport.push(data);

            if (i > 1 && i % 50 === 0) {
                 updateStatus(`Preparing data... ${i - 1} records processed.`);
            }
        }
        
        updateStatus("Data prepared. Executing transactional restore...");

        await db.transaction('rw', db.brushes, async () => {
            await db.brushes.clear();
            if (recordsToImport.length > 0) {
                await db.brushes.bulkAdd(recordsToImport);
            }
        });

        updateStatus(`Library successfully restored from backup. Reloading application...`);
        setTimeout(() => resetUIStates(), 1000);

    } catch (error) {
        console.error("Error during library restore:", error);
        updateStatus(`The restore process failed: ${error.message}. Your library may be in an incomplete state. It is recommended to clear the library and try again.`, true);
    } finally {
        if(restoreLibraryInput) restoreLibraryInput.value = "";
    }
}


async function handleFileInputChange(event) {
    const files = event.target.files;
    if (!files.length) return;
    const importButtonLabels = document.querySelectorAll('label[for="fileInput"].import-button, label[for="fileInput"].import-button-sidebar');

    updateStatus(`Processing ${files.length} file(s)...`);
    let totalBrushesAdded = 0;
    
    if(fileInput) fileInput.disabled = true;
    importButtonLabels.forEach(label => label.classList.add('button-style-disabled'));

    for (const file of files) {
        let count = 0;
        try {
            if (file.name.toLowerCase().endsWith('.brushset')) {
                count = await processBrushsetFile(file);
            } else if (file.name.toLowerCase().endsWith('.brush')) {
                count = await processBrushFile(file);
            } else {
                updateStatus(`Skipped unsupported file: ${file.name}`, true);
            }
            totalBrushesAdded += count;
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            updateStatus(`Error with ${file.name}: ${error.message}. Trying next file.`, true);
        }
    }
    
    if(fileInput) fileInput.disabled = false;
    importButtonLabels.forEach(label => label.classList.remove('button-style-disabled'));
    if(fileInput) fileInput.value = "";

    updateStatus(`Import complete. Added ${totalBrushesAdded} new brushes.`);

    // ** FINAL BUG FIX: Reset filters after import to ensure new brushes are visible. **
    currentViewMode = 'all';
    activeBrushSetFilter = null;
    activeTagFilter.clear();
    
    // Call updateActiveSidebarLink before loadBrushesFromDBAndRender
    updateActiveSidebarLink();
    await loadBrushesFromDBAndRender();
}


async function handleCreateNewBrushSet() {
    let brushesToPackageInternalIds = [];
    let setNameDefault = "My Custom Set";

    if (selectedBrushInternalIds.size > 0) {
        brushesToPackageInternalIds = Array.from(selectedBrushInternalIds);
        setNameDefault = `Selected Brushes Set (${brushesToPackageInternalIds.length})`;
    } else if (currentlyRenderedBrushes.length > 0) {
        if (!confirm(`No brushes are selected. Export all ${currentlyRenderedBrushes.length} brushes in the current view?`)) {
            updateStatus("Brushset creation cancelled.", true);
            return;
        }
        brushesToPackageInternalIds = currentlyRenderedBrusshes.map(b => b.internalId);
        setNameDefault = `View Export (${currentlyRenderedBrushes.length}) Set`;
    } else {
        updateStatus("No brushes to create a set from.", true);
        return;
    }

    const setName = prompt(`Enter a name for the new .brushset file:`, setNameDefault);
    if (!setName || !setName.trim()) {
        updateStatus("Brushset creation cancelled.", true);
        return;
    }

    updateStatus(`Creating '${setName}.brushset'...`);
    try {
        const brushesToPackage = await db.brushes.bulkGet(brushesToPackageInternalIds);
        const zip = new JSZip();
        const brushUUIDsForPlist = [];
        
        for (const brush of brushesToPackage) {
            if (brush && brush.uuid && brush.brushArchiveBlob && brush.thumbnailBlob) {
                const brushFolderInZip = zip.folder(brush.uuid);
                brushFolderInZip.file("Brush.archive", brush.brushArchiveBlob);
                brushFolderInZip.folder("QuickLook").file("Thumbnail.png", brush.thumbnailBlob);
                if (brush.shapeBlob) brushFolderInZip.file("Shape.png", brush.shapeBlob);
                if (brush.grainBlob) brushFolderInZip.file("Grain.png", brush.grainBlob);
                brushUUIDsForPlist.push(brush.uuid);
            }
        }

        if (brushUUIDsForPlist.length === 0) {
            updateStatus("No valid brushes could be packaged.", true);
            return;
        }
        
        let plistContent = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>name</key>\n  <string>${setName.replace(/[<&>]/g, c => ({'<':'<','>':'>','&':'&'})[c])}</string>\n  <key>brushes</key>\n  <array>\n${brushUUIDsForPlist.map(uuid => `    <string>${uuid}</string>`).join('\n')}\n  </array>\n</dict>\n</plist>`;
        zip.file('brushset.plist', plistContent);
        
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: "DEFLATE", level: 6 });
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        const sanitizedFileName = setName.replace(/[^a-z0-9_.-]+/gi, '_').replace(/\.$/, '');
        downloadLink.download = `${sanitizedFileName || 'Untitled'}.brushset`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        updateStatus(`Successfully created '${sanitizedFileName}.brushset'.`);
    } catch (error) {
        console.error("Error creating .brushset:", error);
        updateStatus(`Error creating .brushset: ${error.message}`, true);
    }
}
// ===== END OF FILE: brushvault/js/handlers/dataHandlers.js ===== //