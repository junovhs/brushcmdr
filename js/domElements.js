// --- DOM Element References ---

// File Input
const fileInput = document.getElementById('fileInput');

// Sidebar elements
const sidebar = document.getElementById('sidebar');
const allBrushesLink = document.getElementById('allBrushesLink');
const favoritesLink = document.getElementById('favoritesLink');
const brushSetsListUL = document.getElementById('brushSetsList');
const tagsListUL = document.getElementById('tagsList');
const backupLibraryButton = document.getElementById('backupLibraryButton');
const restoreLibraryInput = document.getElementById('restoreLibraryInput');

// Header
const mainContentTitleAppHeader = document.getElementById('mainContentTitleAppHeader');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const selectAllButtonDesktop = document.getElementById('selectAllButtonDesktop');
const deselectAllButtonDesktop = document.getElementById('deselectAllButtonDesktop');

// Brush grid
const outputDiv = document.getElementById('output');

// Right Panel
const selectedBrushActionsPanelContainer = document.getElementById('selectedBrushActionsPanelContainer');
const selectedBrushActionsPanel = document.getElementById('selectedBrushActionsPanel');
const panelHeader = document.getElementById('panelHeader');
const singleBrushEditSection = document.getElementById('singleBrushEditSection');
const brushNameInput = document.getElementById('brushNameInput');
const brushIsFavoriteCheckbox = document.getElementById('brushIsFavoriteCheckbox');
const brushNotesTextarea = document.getElementById('brushNotesTextarea');
const saveBrushDetailsButton = document.getElementById('saveBrushDetailsButton');
const commonTagsDisplayDiv = document.getElementById('commonTagsDisplay');
const tagsToAddInput = document.getElementById('tagsToAddInput');
const applyTagsButton = document.getElementById('applyTagsButton');
const multipleBrushesActionSection = document.getElementById('multipleBrushesActionSection');
const createNewSetButton = document.getElementById('createNewSetButton');
const deleteSelectedButton = document.getElementById('deleteSelectedButton');

// Global
const clearDbButton = document.getElementById('clearDbButton');

// Mobile UI
const mobileNavToggle = document.getElementById('mobileNavToggle');
const mobileSearchToggle = document.getElementById('mobileSearchToggle');
const mobileSortToggle = document.getElementById('mobileSortToggle');
const mobileSearchBar = document.getElementById('mobileSearchBar');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const mobileSortOptions = document.getElementById('mobileSortOptions');
const pageOverlay = document.getElementById('pageOverlay');

// Help Modal
const headerHelpToggle = document.getElementById('headerHelpToggle');
const mobileHeaderHelpToggle = document.getElementById('mobileHeaderHelpToggle');
const helpModal = document.getElementById('helpModal');
const closeHelpModal = document.getElementById('closeHelpModal');

// Inspector Elements
const inspectorOverlay = document.getElementById('inspector-overlay');
const inspectorCloseBtn = document.getElementById('inspector-close-btn');
const inspectorPrevBtn = document.getElementById('inspector-prev-btn');
const inspectorNextBtn = document.getElementById('inspector-next-btn');
const inspectorMainImage = document.getElementById('inspector-main-image');
const inspectorBrushName = document.getElementById('inspector-brush-name');
const inspectorAuthor = document.getElementById('inspector-author')?.querySelector('span');
const inspectorSource = document.getElementById('inspector-source')?.querySelector('span');
const inspectorAdded = document.getElementById('inspector-added')?.querySelector('span');
const inspectorStrokeThumbWrapper = document.getElementById('inspector-stroke-thumb-wrapper');
const inspectorShapeThumbWrapper = document.getElementById('inspector-shape-thumb-wrapper');
const inspectorGrainThumbWrapper = document.getElementById('inspector-grain-thumb-wrapper');
const inspectorStrokeThumb = document.getElementById('inspector-stroke-thumb');
const inspectorShapeThumb = document.getElementById('inspector-shape-thumb');
const inspectorGrainThumb = document.getElementById('inspector-grain-thumb');
const inspectorBehaviorList = document.getElementById('inspector-behavior-list');
const inspectorPreviewWrapper = document.getElementById('inspector-preview-wrapper');