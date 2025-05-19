// --- DOM Element References ---

// File Input
const fileInput = document.getElementById('fileInput');

// Sidebar elements
const sidebar = document.getElementById('sidebar');
const allBrushesLink = document.getElementById('allBrushesLink');
const favoritesLink = document.getElementById('favoritesLink');
const brushSetsListUL = document.getElementById('brushSetsList');
const tagsListUL = document.getElementById('tagsList');

// Main content header elements
const contentHeader = document.getElementById('contentHeader'); // This still exists for search/sort
// const mainContentTitle = document.getElementById('mainContentTitle'); // Original title element ID
const mainContentTitleAppHeader = document.getElementById('mainContentTitleAppHeader'); // New title element in app header
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const desktopContentActions = document.getElementById('desktopContentActions');
const mobileTitleActionsContainer = document.querySelector('.mobile-title-actions');

// Dynamically created select/deselect buttons - will be referenced after creation in ui.js
let selectAllButtonDesktop = null;
let deselectAllButtonDesktop = null;
let selectAllButtonMobile = null;
let deselectAllButtonMobile = null;


// Brush grid output area
const outputDiv = document.getElementById('output');

// Selected Brush Actions Panel (Right Panel - mostly for Desktop)
const selectedBrushActionsPanelContainer = document.getElementById('selectedBrushActionsPanelContainer');
const selectedBrushActionsPanel = document.getElementById('selectedBrushActionsPanel');
const panelHeader = document.getElementById('panelHeader');
const singleBrushEditSection = document.getElementById('singleBrushEditSection');
const brushNameInput = document.getElementById('brushNameInput');
const brushIsFavoriteCheckbox = document.getElementById('brushIsFavoriteCheckbox');
const brushNotesTextarea = document.getElementById('brushNotesTextarea');
const saveBrushDetailsButton = document.getElementById('saveBrushDetailsButton');
const archiveInsightsContent = document.getElementById('archiveInsightsContent'); // Still referenced even if hidden
const commonTagsDisplayDiv = document.getElementById('commonTagsDisplay');
const tagsToAddInput = document.getElementById('tagsToAddInput');
const applyTagsButton = document.getElementById('applyTagsButton');
const multipleBrushesActionSection = document.getElementById('multipleBrushesActionSection');

// Panel buttons (desktop)
const createNewSetButton = document.getElementById('createNewSetButton');
// const deleteSelectedButton = document.getElementById('deleteSelectedButton'); // Original panel button
const deleteSelectedButtonFixed = document.getElementById('deleteSelectedButtonFixed'); // New fixed button

// Page controls / Global actions
const clearDbButton = document.getElementById('clearDbButton');
// Backup and Import library buttons removed from DOM elements as they are removed from UI

// Mobile UI Elements
const mobileNavToggle = document.getElementById('mobileNavToggle');
const mobileSearchToggle = document.getElementById('mobileSearchToggle');
const mobileSortToggle = document.getElementById('mobileSortToggle');
const mobileSearchBar = document.getElementById('mobileSearchBar');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const mobileSortOptions = document.getElementById('mobileSortOptions');
const pageOverlay = document.getElementById('pageOverlay');

// Mobile Bottom Action Bar
const mobileBottomActionBar = document.getElementById('mobileBottomActionBar');
const mobileSelectedCount = document.getElementById('mobileSelectedCount');
const mobileTagButton = document.getElementById('mobileTagButton');
const mobileCreateSetButton = document.getElementById('mobileCreateSetButton');
const mobileEditButton = document.getElementById('mobileEditButton');
const mobileDeleteButton = document.getElementById('mobileDeleteButton'); // This is the one in the mobile action bar

// Help Modal Elements
const headerHelpToggle = document.getElementById('headerHelpToggle');
const mobileHeaderHelpToggle = document.getElementById('mobileHeaderHelpToggle');
const helpModal = document.getElementById('helpModal');
const closeHelpModal = document.getElementById('closeHelpModal');