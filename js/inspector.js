// --- Brush Inspector Logic ---

// State
let isInspectorOpen = false, currentInspectorBrushId = null, currentInspectorIndex = -1;
let isDragging = false, start = { x: 0, y: 0 }, offset = { x: 0, y: 0 }, scale = 1, initialPinchDistance = 0;

// Main Functions
async function openInspector(brushId) {
    if (!inspectorOverlay) return; 
    resetTransform();
    document.body.style.overflow = 'hidden';
    const brush = await db.brushes.get(brushId);
    if (!brush) { updateStatus("Could not find brush to inspect.", true); return; }
    
    currentInspectorBrushId = brushId;
    currentInspectorIndex = currentlyRenderedBrushes.findIndex(b => b.internalId === brushId);
    
    await populateInspectorUI(brush);
    updateInspectorNav();
    isInspectorOpen = true;
    inspectorOverlay.style.display = 'flex';
    setTimeout(() => inspectorOverlay.classList.add('visible'), 10);
}

function closeInspector() {
    if (!isInspectorOpen) return;
    isInspectorOpen = false;
    document.body.style.overflow = '';
    inspectorOverlay.classList.remove('visible');
    setTimeout(() => { inspectorOverlay.style.display = 'none'; revokeAllBlobImages(); }, 300);
}

// UI Population & Data Parsing
async function populateInspectorUI(brush) {
    inspectorBrushName.textContent = brush.name;
    
    // Populate details section
    // The "By:" field is now removed from the UI for this release.
    if (inspectorSource) {
        if (brush.isFromSet && brush.setName) {
            inspectorSource.innerHTML = `<a href="#" data-set-name-link="${brush.setName}">${brush.setName}</a>`;
            const link = inspectorSource.querySelector('a');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                closeInspector();
                handleBrushSetFilterClick(e, brush.setName);
            });
        } else {
            inspectorSource.textContent = 'Single Brush';
        }
    }
    if (inspectorAdded && brush.dateAdded) {
        inspectorAdded.textContent = new Date(brush.dateAdded).toLocaleDateString();
    }
    
    setDnaThumb(inspectorStrokeThumbWrapper, inspectorStrokeThumb, brush.thumbnailBlob);
    setDnaThumb(inspectorShapeThumbWrapper, inspectorShapeThumb, brush.shapeBlob);
    setDnaThumb(inspectorGrainThumbWrapper, inspectorGrainThumb, brush.grainBlob);
    
    setBlobImage(inspectorMainImage, brush.thumbnailBlob);
    setActiveDnaThumb('stroke');
    
    await displayBehaviorFacts(brush);
}

async function displayBehaviorFacts(brush) {
    inspectorBehaviorList.innerHTML = '<li>Loading insights...</li>';
    if (!brush.brushArchiveBlob) { 
        inspectorBehaviorList.innerHTML = '<li>Behavior data unavailable.</li>'; 
        return; 
    }
    try {
        const buffer = await brush.brushArchiveBlob.arrayBuffer();
        const bplist = window.bplistParserManual.parseBuffer(buffer)[0];
        const objects = bplist.$objects;
        const brushData = objects[1];

        if (typeof brushData !== 'object' || brushData === null) throw new Error("Brush data object not found.");

        const getVal = (v) => (v && v.UID !== undefined) ? objects[v.UID] : v;
        
        let facts = [];
        const isTapering = getVal(brushData.taperEndLength) > 0 || getVal(brushData.taperStartLength) > 0;
        facts.push({ l: "Tapering", v: isTapering ? "Active" : "Inactive" });

        const stab = getVal(brushData.plotMovingAverageStabilization) || 0;
        facts.push({ l: "Stabilization", v: (stab > 0) ? `${(stab * 100).toFixed(0)}%` : "Off" });
        
        const pAction = getVal(brushData.dynamicsPressureOpacity) > 0 ? 'opacity' : (getVal(brushData.dynamicsPressureSize) > 0 ? 'size' : null);
        facts.push({ l: "Pressure", v: pAction ? `Controls ${pAction}` : "Inactive" });

        const isTilting = getVal(brushData.dynamicsTiltOpacity) > 0 || getVal(brushData.dynamicsTiltSize) > 0;
        facts.push({ l: "Tilt", v: isTilting ? "Active" : "Inactive" });
        
        const isWet = getVal(brushData.dynamicsMix) > 0;
        const blend = getVal(brushData.blendMode);
        let cVal = `Mode ${blend || 'Normal'}`;
        if (isWet) cVal = "Wet Mix";
        if (blend === 18) cVal = "Glazed";
        facts.push({ l: "Color", v: cVal });
        
        inspectorBehaviorList.innerHTML = facts.map(f => `<li><strong>${f.l}:</strong> ${f.v}</li>`).join('');
    } catch (e) {
        console.error("Parser failed:", e);
        inspectorBehaviorList.innerHTML = '<li>Could not read behavior data.</li>';
    }
}


// Unchanged helper functions
function updateInspectorNav() {const display=currentlyRenderedBrushes.length>1?'flex':'none';inspectorPrevBtn.style.display=display;inspectorNextBtn.style.display=display;}
function applyTransform() { if (inspectorMainImage) inspectorMainImage.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`; }
function resetTransform() { scale = 1; offset = { x: 0, y: 0 }; start = { x: 0, y: 0 }; applyTransform(); }
function handleWheel(e){e.preventDefault();const rect=inspectorPreviewWrapper.getBoundingClientRect();const zf=e.deltaY<0?1.1:0.9;const mx=e.clientX-rect.left;const my=e.clientY-rect.top;offset.x=mx-(mx-offset.x)*zf;offset.y=my-(my-offset.y)*zf;scale*=zf;scale=Math.max(0.5,Math.min(scale,10));applyTransform();}
function handlePointerDown(e){e.preventDefault();isDragging=true;start.x=e.clientX-offset.x;start.y=e.clientY-offset.y;inspectorPreviewWrapper.style.cursor='grabbing';}
function handlePointerMove(e){if(!isDragging)return;e.preventDefault();offset.x=e.clientX-start.x;offset.y=e.clientY-start.y;applyTransform();}
function handlePointerUp(e){isDragging=false;inspectorPreviewWrapper.style.cursor='grab';}
function handleTouchStart(e){if(e.touches.length===2){e.preventDefault();initialPinchDistance=getPinchDistance(e.touches);} else if(e.touches.length===1){e.preventDefault();isDragging=true;start.x=e.touches[0].clientX-offset.x;start.y=e.touches[0].clientY-offset.y;}}
function handleTouchMove(e){if(e.touches.length===2){e.preventDefault();const nPD=getPinchDistance(e.touches);const zf=nPD/initialPinchDistance;const c=getPinchCenter(e.touches);const rect=inspectorPreviewWrapper.getBoundingClientRect();const px=c.x-rect.left;const py=c.y-rect.top;offset.x=px-(px-offset.x)*zf;offset.y=py-(py-offset.y)*zf;scale*=zf;scale=Math.max(0.5,Math.min(scale,10));initialPinchDistance=nPD;applyTransform();}else if(e.touches.length===1&&isDragging){e.preventDefault();offset.x=e.touches[0].clientX-start.x;offset.y=e.touches[0].clientY-start.y;applyTransform();}}
function handleTouchEnd(e){isDragging=false;if(e.touches.length<2)initialPinchDistance=0;if(e.touches.length===1){isDragging=true;start.x=e.touches[0].clientX-offset.x;start.y=e.touches[0].clientY-offset.y;}}
function getPinchDistance(t){const dx=t[0].clientX-t[1].clientX;const dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy);}
function getPinchCenter(t){return{x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2};}
function handleInspectorKeyPress(e){if(!isInspectorOpen)return;if(e.key==='Escape')closeInspector();if(e.key==='ArrowRight')navigateInspector('next');if(e.key==='ArrowLeft')navigateInspector('prev');}
function navigateInspector(dir){currentInspectorIndex=(dir==='next')?(currentInspectorIndex+1)%currentlyRenderedBrushes.length:(currentInspectorIndex-1+currentlyRenderedBrushes.length)%currentlyRenderedBrushes.length;const nextBrush=currentlyRenderedBrushes[currentInspectorIndex];if(nextBrush)openInspector(nextBrush.internalId);}
async function handleDnaClick(wrapper){if(wrapper.classList.contains('no-asset'))return;const brush=await db.brushes.get(currentInspectorBrushId);const type=wrapper.dataset.sourceType;if(!brush)return;resetTransform();let blob;switch(type){case 'shape':blob=brush.shapeBlob;break;case 'grain':blob=brush.grainBlob;break;default:blob=brush.thumbnailBlob;break;}setBlobImage(inspectorMainImage,blob);setActiveDnaThumb(type);}
function setDnaThumb(w,img,blob){const p=w.querySelector('.dna-placeholder');if(blob instanceof Blob&&blob.size>0){setBlobImage(img,blob);img.style.display='block';if(p)p.style.display='none';w.classList.remove('no-asset');}else{img.style.display='none';if(p)p.style.display='block';w.classList.add('no-asset');}}
function setBlobImage(img,blob){revokeBlobImage(img);if(img&&blob instanceof Blob&&blob.size>0)img.src=URL.createObjectURL(blob);}
function revokeBlobImage(img){if(img?.src.startsWith('blob:'))URL.revokeObjectURL(img.src);}
function revokeAllBlobImages(){revokeBlobImage(inspectorMainImage);revokeBlobImage(inspectorStrokeThumb);revokeBlobImage(inspectorShapeThumb);revokeBlobImage(inspectorGrainThumb);}
function setActiveDnaThumb(type){inspectorStrokeThumbWrapper.classList.toggle('active',type==='stroke');inspectorShapeThumbWrapper.classList.toggle('active',type==='shape');inspectorGrainThumbWrapper.classList.toggle('active',type==='grain');}

document.addEventListener('DOMContentLoaded',()=>{
    document.addEventListener('keydown',handleInspectorKeyPress);
    inspectorCloseBtn?.addEventListener('click',closeInspector);
    inspectorOverlay?.addEventListener('click',(e)=>{if(e.target===inspectorOverlay)closeInspector();});
    inspectorPrevBtn?.addEventListener('click',()=>navigateInspector('prev'));
    inspectorNextBtn?.addEventListener('click',()=>navigateInspector('next'));
    inspectorPreviewWrapper?.addEventListener('pointerdown',handlePointerDown);
    inspectorPreviewWrapper?.addEventListener('pointermove',handlePointerMove);
    inspectorPreviewWrapper?.addEventListener('pointerup',handlePointerUp);
    inspectorPreviewWrapper?.addEventListener('pointercancel',handlePointerUp);
    inspectorPreviewWrapper?.addEventListener('wheel',handleWheel,{passive:false});
    inspectorPreviewWrapper?.addEventListener('touchstart',handleTouchStart,{passive:false});
    inspectorPreviewWrapper?.addEventListener('touchmove',handleTouchMove,{passive:false});
    inspectorPreviewWrapper?.addEventListener('touchend',handleTouchEnd);
    inspectorStrokeThumbWrapper?.addEventListener('click',()=>handleDnaClick(inspectorStrokeThumbWrapper));
    inspectorShapeThumbWrapper?.addEventListener('click',()=>handleDnaClick(inspectorShapeThumbWrapper));
    inspectorGrainThumbWrapper?.addEventListener('click',()=>handleDnaClick(inspectorGrainThumbWrapper));
});