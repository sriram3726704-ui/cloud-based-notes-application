/**
 * CloudNotes - Cloud-Based Realtime Notes App
 * ===========================================
 * Core JavaScript logic implementing:
 * - Realtime synchronization with Firebase Firestore
 * - Note creation, inline editing, pinning, and deletion
 * - Fallback Demo Mode with persistent local storage
 * - Search, category filtering, and sorting
 * - Color theming (dark/light) & note color accents
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { firebaseConfig as fileConfig } from './firebase-config.js';

// ============================================================================
// State Management
// ============================================================================
const state = {
  db: null,
  isFirebaseActive: false,
  unsubscribeSnapshot: null,
  notes: [],
  filteredNotes: [],
  currentCategory: 'all',
  searchQuery: '',
  sortBy: 'date-desc',
  activeQuickColor: 'default',
  activeModalColor: 'default',
  noteToDeleteId: null,
  activeTheme: 'light'
};

// Initial sample notes for Demo Mode
const DEMO_SEED_NOTES = [
  {
    id: 'demo-1',
    title: '✨ Welcome to CloudNotes!',
    content: 'This note is currently stored in Demo Mode.\n\nTo sync your notes to the cloud:\n1. Click the Firebase Settings (gear icon) in the top right\n2. Follow the 3-step guide to connect your Firebase Firestore\n3. Enjoy instant real-time synchronization across all your tabs and devices!',
    category: 'General',
    color: 'emerald',
    isPinned: true,
    createdAt: new Date(Date.now() - 3600000 * 2),
    updatedAt: new Date(Date.now() - 3600000 * 2)
  },
  {
    id: 'demo-2',
    title: '🚀 Cloud Firestore Features',
    content: '• Real-time updates via onSnapshot listeners\n• Add, edit, pin, and delete notes instantly\n• Color coding & category classification\n• Fast full-text search across titles & contents',
    category: 'Ideas',
    color: 'sky',
    isPinned: true,
    createdAt: new Date(Date.now() - 3600000 * 5),
    updatedAt: new Date(Date.now() - 3600000 * 5)
  },
  {
    id: 'demo-3',
    title: '📋 Project Checklist',
    content: '- [x] Create sleek responsive UI\n- [x] Configure Firebase modular SDK\n- [x] Implement real-time CRUD operations\n- [ ] Connect custom Firebase project',
    category: 'Tasks',
    color: 'amber',
    isPinned: false,
    createdAt: new Date(Date.now() - 3600000 * 24),
    updatedAt: new Date(Date.now() - 3600000 * 24)
  }
];

// ============================================================================
// DOM Elements
// ============================================================================
const elements = {
  // Brand & Header
  brandLogoBtn: document.getElementById('brandLogoBtn'),
  storageBadge: document.getElementById('storageBadge'),
  cloudStatusBtn: document.getElementById('cloudStatusBtn'),
  cloudStatusDot: document.getElementById('cloudStatusDot'),
  cloudStatusText: document.getElementById('cloudStatusText'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIconSun: document.getElementById('themeIconSun'),
  themeIconMoon: document.getElementById('themeIconMoon'),
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  openNewNoteModalBtn: document.getElementById('openNewNoteModalBtn'),

  // Search
  searchInput: document.getElementById('searchInput'),
  searchClearBtn: document.getElementById('searchClearBtn'),

  // Cloud Banner
  firebaseNoticeBanner: document.getElementById('firebaseNoticeBanner'),
  bannerConnectBtn: document.getElementById('bannerConnectBtn'),
  bannerDismissBtn: document.getElementById('bannerDismissBtn'),

  // Quick Note
  quickNoteCard: document.getElementById('quickNoteCard'),
  quickNoteCollapsed: document.getElementById('quickNoteCollapsed'),
  quickNoteExpanded: document.getElementById('quickNoteExpanded'),
  quickNoteTitle: document.getElementById('quickNoteTitle'),
  quickNoteBody: document.getElementById('quickNoteBody'),
  quickNoteCategory: document.getElementById('quickNoteCategory'),
  quickColorPicker: document.getElementById('quickColorPicker'),
  quickNoteCancelBtn: document.getElementById('quickNoteCancelBtn'),

  // Filters & Sections
  categoryFilterContainer: document.getElementById('categoryFilterContainer'),
  sortSelect: document.getElementById('sortSelect'),
  pinnedNotesSection: document.getElementById('pinnedNotesSection'),
  pinnedNotesGrid: document.getElementById('pinnedNotesGrid'),
  pinnedCountBadge: document.getElementById('pinnedCountBadge'),
  allNotesHeader: document.getElementById('allNotesHeader'),
  otherCountBadge: document.getElementById('otherCountBadge'),
  notesGrid: document.getElementById('notesGrid'),
  emptyState: document.getElementById('emptyState'),
  emptyStateTitle: document.getElementById('emptyStateTitle'),
  emptyStateDesc: document.getElementById('emptyStateDesc'),
  emptyStateCreateBtn: document.getElementById('emptyStateCreateBtn'),

  // Note Modal
  noteModalBackdrop: document.getElementById('noteModalBackdrop'),
  noteModalTitle: document.getElementById('noteModalTitle'),
  noteModalCloseBtn: document.getElementById('noteModalCloseBtn'),
  noteForm: document.getElementById('noteForm'),
  noteFormId: document.getElementById('noteFormId'),
  modalNoteTitle: document.getElementById('modalNoteTitle'),
  modalNoteCategory: document.getElementById('modalNoteCategory'),
  modalNotePinned: document.getElementById('modalNotePinned'),
  modalNoteContent: document.getElementById('modalNoteContent'),
  modalColorPicker: document.getElementById('modalColorPicker'),
  modalCancelBtn: document.getElementById('modalCancelBtn'),
  modalSaveBtn: document.getElementById('modalSaveBtn'),
  modalSaveBtnText: document.getElementById('modalSaveBtnText'),

  // Firebase Settings Modal
  settingsModalBackdrop: document.getElementById('settingsModalBackdrop'),
  settingsModalCloseBtn: document.getElementById('settingsModalCloseBtn'),
  settingsCancelBtn: document.getElementById('settingsCancelBtn'),
  saveFirebaseSettingsBtn: document.getElementById('saveFirebaseSettingsBtn'),
  useDemoModeBtn: document.getElementById('useDemoModeBtn'),
  firebaseConfigSnippet: document.getElementById('firebaseConfigSnippet'),
  cfgApiKey: document.getElementById('cfgApiKey'),
  cfgProjectId: document.getElementById('cfgProjectId'),
  cfgAuthDomain: document.getElementById('cfgAuthDomain'),
  cfgStorageBucket: document.getElementById('cfgStorageBucket'),
  cfgAppId: document.getElementById('cfgAppId'),

  // Delete Confirmation Modal
  deleteModalBackdrop: document.getElementById('deleteModalBackdrop'),
  deleteModalCloseBtn: document.getElementById('deleteModalCloseBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  deleteNoteTitlePreview: document.getElementById('deleteNoteTitlePreview'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer')
};

// ============================================================================
// Initialization & Configuration
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  initFirebaseOrDemo();
});

/**
 * Initializes Theme based on localStorage or user system preference
 */
function initTheme() {
  const savedTheme = localStorage.getItem('cloud_notes_theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function applyTheme(theme) {
  state.activeTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cloud_notes_theme', theme);

  if (theme === 'dark') {
    elements.themeIconSun.style.display = 'none';
    elements.themeIconMoon.style.display = 'block';
  } else {
    elements.themeIconSun.style.display = 'block';
    elements.themeIconMoon.style.display = 'none';
  }
}

/**
 * Retrieves effective Firebase configuration from localStorage or firebase-config.js
 */
function getEffectiveConfig() {
  const localSavedConfig = localStorage.getItem('cloud_notes_firebase_config');
  if (localSavedConfig) {
    try {
      const parsed = JSON.parse(localSavedConfig);
      if (parsed && parsed.apiKey && !parsed.apiKey.includes('YOUR_API_KEY')) {
        return parsed;
      }
    } catch (e) {
      console.warn('Failed parsing saved config:', e);
    }
  }

  if (fileConfig && fileConfig.apiKey && !fileConfig.apiKey.includes('YOUR_API_KEY')) {
    return fileConfig;
  }

  return null;
}

/**
 * Initializes Firebase Firestore or falls back to Demo Mode
 */
function initFirebaseOrDemo() {
  const config = getEffectiveConfig();
  const dismissedBanner = sessionStorage.getItem('cloud_notes_banner_dismissed');

  if (config) {
    try {
      const app = initializeApp(config);
      state.db = getFirestore(app);
      state.isFirebaseActive = true;

      // Update UI Status
      elements.cloudStatusDot.className = 'status-dot connected';
      elements.cloudStatusText.textContent = 'Cloud Synced';
      elements.storageBadge.textContent = 'Firestore Cloud';
      elements.firebaseNoticeBanner.style.display = 'none';

      showToast('Connected to Firebase Firestore', 'success');

      // Attach Firestore realtime listener
      subscribeToFirestore();
      return;
    } catch (err) {
      console.error('Firebase initialization failed:', err);
      showToast('Firebase connection failed: ' + err.message, 'error');
    }
  }

  // Fallback to Demo Mode
  initDemoMode(!dismissedBanner);
}

/**
 * Sets up Demo Mode with LocalStorage
 */
function initDemoMode(showNoticeBanner = true) {
  state.isFirebaseActive = false;
  state.db = null;

  elements.cloudStatusDot.className = 'status-dot demo';
  elements.cloudStatusText.textContent = 'Demo Mode (Offline)';
  elements.storageBadge.textContent = 'Local Demo Mode';

  if (showNoticeBanner) {
    elements.firebaseNoticeBanner.style.display = 'flex';
  } else {
    elements.firebaseNoticeBanner.style.display = 'none';
  }

  loadDemoNotes();
}

/**
 * Loads notes from localStorage or initializes with demo seeds
 */
function loadDemoNotes() {
  const rawData = localStorage.getItem('cloud_notes_demo_data');
  if (rawData) {
    try {
      const parsed = JSON.parse(rawData);
      state.notes = parsed.map(n => ({
        ...n,
        createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        updatedAt: n.updatedAt ? new Date(n.updatedAt) : new Date()
      }));
    } catch (e) {
      state.notes = [...DEMO_SEED_NOTES];
      saveDemoNotes();
    }
  } else {
    state.notes = [...DEMO_SEED_NOTES];
    saveDemoNotes();
  }
  applyFiltersAndRender();
}

function saveDemoNotes() {
  localStorage.setItem('cloud_notes_demo_data', JSON.stringify(state.notes));
}

// ============================================================================
// Firebase Firestore Subscription
// ============================================================================
function subscribeToFirestore() {
  if (!state.db) return;

  if (state.unsubscribeSnapshot) {
    state.unsubscribeSnapshot();
  }

  try {
    const notesCol = collection(state.db, 'notes');
    const q = query(notesCol, orderBy('createdAt', 'desc'));

    state.unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      state.notes = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || '',
          content: data.content || '',
          category: data.category || 'General',
          color: data.color || 'default',
          isPinned: !!data.isPinned,
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
          updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : new Date()
        };
      });

      applyFiltersAndRender();
    }, (error) => {
      console.error('Firestore snapshot error:', error);
      elements.cloudStatusDot.className = 'status-dot error';
      elements.cloudStatusText.textContent = 'Sync Error';
      showToast('Firestore error: Check security rules in Firebase Console', 'error');
    });
  } catch (err) {
    console.error('Failed to setup Firestore listener:', err);
    showToast('Failed to setup cloud listener: ' + err.message, 'error');
  }
}

// ============================================================================
// CRUD Note Operations
// ============================================================================

/**
 * Add a new note to Cloud or LocalStorage
 */
async function handleCreateNote({ title, content, category, color, isPinned }) {
  const newNoteData = {
    title: title.trim(),
    content: content.trim(),
    category: category || 'General',
    color: color || 'default',
    isPinned: Boolean(isPinned),
  };

  if (!newNoteData.title && !newNoteData.content) {
    showToast('Please enter a title or content for your note', 'warning');
    return;
  }

  if (state.isFirebaseActive && state.db) {
    try {
      await addDoc(collection(state.db, 'notes'), {
        ...newNoteData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      showToast('Note synced to cloud ✨', 'success');
    } catch (err) {
      console.error('Error adding note to Firestore:', err);
      showToast('Cloud save failed: ' + err.message, 'error');
    }
  } else {
    // Demo Mode
    const newNote = {
      ...newNoteData,
      id: 'demo_' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    state.notes.unshift(newNote);
    saveDemoNotes();
    applyFiltersAndRender();
    showToast('Note saved (Demo Mode) ✨', 'success');
  }
}

/**
 * Edit an existing note
 */
async function handleUpdateNote(id, { title, content, category, color, isPinned }) {
  const updatedData = {
    title: title.trim(),
    content: content.trim(),
    category: category || 'General',
    color: color || 'default',
    isPinned: Boolean(isPinned),
  };

  if (state.isFirebaseActive && state.db) {
    try {
      const noteRef = doc(state.db, 'notes', id);
      await updateDoc(noteRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      showToast('Cloud note updated', 'success');
    } catch (err) {
      console.error('Error updating note in Firestore:', err);
      showToast('Update failed: ' + err.message, 'error');
    }
  } else {
    // Demo Mode
    const index = state.notes.findIndex(n => n.id === id);
    if (index !== -1) {
      state.notes[index] = {
        ...state.notes[index],
        ...updatedData,
        updatedAt: new Date()
      };
      saveDemoNotes();
      applyFiltersAndRender();
      showToast('Note updated (Demo Mode)', 'success');
    }
  }
}

/**
 * Delete a note
 */
async function handleDeleteNote(id) {
  if (state.isFirebaseActive && state.db) {
    try {
      await deleteDoc(doc(state.db, 'notes', id));
      showToast('Note deleted from cloud', 'info');
    } catch (err) {
      console.error('Error deleting note from Firestore:', err);
      showToast('Delete failed: ' + err.message, 'error');
    }
  } else {
    // Demo Mode
    state.notes = state.notes.filter(n => n.id !== id);
    saveDemoNotes();
    applyFiltersAndRender();
    showToast('Note deleted', 'info');
  }
}

/**
 * Toggle pinned status
 */
async function handleTogglePin(id, currentPinned) {
  const newPinned = !currentPinned;

  if (state.isFirebaseActive && state.db) {
    try {
      const noteRef = doc(state.db, 'notes', id);
      await updateDoc(noteRef, {
        isPinned: newPinned,
        updatedAt: serverTimestamp()
      });
      showToast(newPinned ? 'Note pinned to top' : 'Note unpinned', 'info');
    } catch (err) {
      console.error('Error toggling pin in Firestore:', err);
      showToast('Failed updating pin status', 'error');
    }
  } else {
    // Demo Mode
    const note = state.notes.find(n => n.id === id);
    if (note) {
      note.isPinned = newPinned;
      note.updatedAt = new Date();
      saveDemoNotes();
      applyFiltersAndRender();
      showToast(newPinned ? 'Note pinned to top' : 'Note unpinned', 'info');
    }
  }
}

// ============================================================================
// Filtering, Sorting, and Rendering
// ============================================================================

function applyFiltersAndRender() {
  updateCategoryCounts();

  let result = [...state.notes];

  // 1. Category Filter
  if (state.currentCategory !== 'all') {
    result = result.filter(n => (n.category || 'General').toLowerCase() === state.currentCategory.toLowerCase());
  }

  // 2. Search Filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    result = result.filter(n => 
      (n.title && n.title.toLowerCase().includes(q)) || 
      (n.content && n.content.toLowerCase().includes(q))
    );
  }

  // 3. Sorting
  result.sort((a, b) => {
    if (state.sortBy === 'date-asc') {
      return (new Date(a.createdAt) - new Date(b.createdAt));
    } else if (state.sortBy === 'title-asc') {
      return (a.title || '').localeCompare(b.title || '');
    } else {
      // date-desc default
      return (new Date(b.createdAt) - new Date(a.createdAt));
    }
  });

  state.filteredNotes = result;

  renderNotes();
}

function updateCategoryCounts() {
  const counts = {
    all: state.notes.length,
    General: 0,
    Work: 0,
    Personal: 0,
    Ideas: 0,
    Tasks: 0,
    Study: 0
  };

  state.notes.forEach(n => {
    const cat = n.category || 'General';
    if (counts[cat] !== undefined) {
      counts[cat]++;
    }
  });

  const countAll = document.getElementById('countAll');
  if (countAll) countAll.textContent = counts.all;
  const countGen = document.getElementById('countGeneral');
  if (countGen) countGen.textContent = counts.General;
  const countWork = document.getElementById('countWork');
  if (countWork) countWork.textContent = counts.Work;
  const countPers = document.getElementById('countPersonal');
  if (countPers) countPers.textContent = counts.Personal;
  const countIdeas = document.getElementById('countIdeas');
  if (countIdeas) countIdeas.textContent = counts.Ideas;
  const countTasks = document.getElementById('countTasks');
  if (countTasks) countTasks.textContent = counts.Tasks;
  const countStudy = document.getElementById('countStudy');
  if (countStudy) countStudy.textContent = counts.Study;
}

function renderNotes() {
  const pinnedNotes = state.filteredNotes.filter(n => n.isPinned);
  const otherNotes = state.filteredNotes.filter(n => !n.isPinned);

  // Handle Empty State
  if (state.filteredNotes.length === 0) {
    elements.pinnedNotesSection.style.display = 'none';
    elements.allNotesHeader.style.display = 'none';
    elements.notesGrid.innerHTML = '';
    elements.emptyState.style.display = 'block';

    if (state.searchQuery) {
      elements.emptyStateTitle.textContent = 'No matching notes';
      elements.emptyStateDesc.textContent = `No notes found matching "${state.searchQuery}". Try a different keyword or category.`;
    } else if (state.currentCategory !== 'all') {
      elements.emptyStateTitle.textContent = `No ${state.currentCategory} notes`;
      elements.emptyStateDesc.textContent = `You don't have any notes in the ${state.currentCategory} category yet.`;
    } else {
      elements.emptyStateTitle.textContent = 'No notes yet';
      elements.emptyStateDesc.textContent = 'Capture your thoughts, ideas, tasks, or meeting summaries. They sync automatically to the cloud.';
    }
    return;
  }

  elements.emptyState.style.display = 'none';

  // Render Pinned Section
  if (pinnedNotes.length > 0) {
    elements.pinnedNotesSection.style.display = 'block';
    elements.pinnedCountBadge.textContent = pinnedNotes.length;
    elements.pinnedNotesGrid.innerHTML = pinnedNotes.map(n => createNoteCardHtml(n)).join('');
  } else {
    elements.pinnedNotesSection.style.display = 'none';
    elements.pinnedNotesGrid.innerHTML = '';
  }

  // Render Other/All Notes Section
  if (pinnedNotes.length > 0 && otherNotes.length > 0) {
    elements.allNotesHeader.style.display = 'flex';
    elements.otherCountBadge.textContent = otherNotes.length;
  } else {
    elements.allNotesHeader.style.display = 'none';
  }

  elements.notesGrid.innerHTML = otherNotes.map(n => createNoteCardHtml(n)).join('');

  // Attach card event listeners
  attachCardEvents();
}

function createNoteCardHtml(note) {
  const colorVar = `var(--note-${note.color || 'default'})`;
  const timeFormatted = formatRelativeDate(note.updatedAt || note.createdAt);

  return `
    <article class="note-card" data-id="${note.id}" style="--card-bg: ${colorVar};">
      <!-- Pin Button -->
      <button class="note-pin-btn ${note.isPinned ? 'is-pinned' : ''}" data-pin-id="${note.id}" title="${note.isPinned ? 'Unpin note' : 'Pin note'}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="${note.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
        </svg>
      </button>

      <!-- Note Content Area -->
      <div class="note-body-wrapper" data-open-edit="${note.id}">
        <div class="note-header-info">
          <span class="note-category-tag">${escapeHtml(note.category || 'General')}</span>
          ${note.title ? `<h3 class="note-card-title">${escapeHtml(note.title)}</h3>` : ''}
        </div>
        <p class="note-card-content">${escapeHtml(note.content || '')}</p>
      </div>

      <!-- Footer Actions -->
      <div class="note-card-footer">
        <span class="note-date" title="Last updated">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${timeFormatted}
        </span>
        <div class="note-actions">
          <button class="note-action-btn" data-copy-id="${note.id}" title="Copy note text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
            </svg>
          </button>
          <button class="note-action-btn" data-edit-id="${note.id}" title="Edit note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
            </svg>
          </button>
          <button class="note-action-btn delete-btn" data-delete-id="${note.id}" title="Delete note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function attachCardEvents() {
  // Pin buttons
  document.querySelectorAll('[data-pin-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-pin-id');
      const note = state.notes.find(n => n.id === id);
      if (note) {
        handleTogglePin(id, note.isPinned);
      }
    });
  });

  // Open Edit on card body click or edit button
  document.querySelectorAll('[data-open-edit], [data-edit-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-open-edit') || el.getAttribute('data-edit-id');
      const note = state.notes.find(n => n.id === id);
      if (note) {
        openNoteModal(note);
      }
    });
  });

  // Copy note button
  document.querySelectorAll('[data-copy-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-copy-id');
      const note = state.notes.find(n => n.id === id);
      if (note) {
        const textToCopy = `${note.title ? note.title + '\n\n' : ''}${note.content}`;
        navigator.clipboard.writeText(textToCopy)
          .then(() => showToast('Note copied to clipboard 📋', 'info'))
          .catch(() => showToast('Failed to copy to clipboard', 'error'));
      }
    });
  });

  // Delete note button
  document.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-delete-id');
      const note = state.notes.find(n => n.id === id);
      if (note) {
        state.noteToDeleteId = id;
        elements.deleteNoteTitlePreview.textContent = note.title ? `"${note.title}"` : 'this note';
        openModal(elements.deleteModalBackdrop);
      }
    });
  });
}

// ============================================================================
// Modal Handlers
// ============================================================================

function openModal(modalEl) {
  modalEl.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  modalEl.classList.remove('active');
  document.body.style.overflow = '';
}

function openNoteModal(note = null) {
  if (note) {
    // Edit mode
    elements.noteModalTitle.textContent = 'Edit Note';
    elements.modalSaveBtnText.textContent = 'Update Note';
    elements.noteFormId.value = note.id;
    elements.modalNoteTitle.value = note.title || '';
    elements.modalNoteCategory.value = note.category || 'General';
    elements.modalNotePinned.checked = Boolean(note.isPinned);
    elements.modalNoteContent.value = note.content || '';
    selectModalColor(note.color || 'default');
  } else {
    // Create mode
    elements.noteModalTitle.textContent = 'Create Note';
    elements.modalSaveBtnText.textContent = 'Save to Cloud';
    elements.noteFormId.value = '';
    elements.modalNoteTitle.value = '';
    elements.modalNoteCategory.value = state.currentCategory !== 'all' ? state.currentCategory : 'General';
    elements.modalNotePinned.checked = false;
    elements.modalNoteContent.value = '';
    selectModalColor('default');
  }

  openModal(elements.noteModalBackdrop);
  setTimeout(() => elements.modalNoteTitle.focus(), 100);
}

function selectModalColor(color) {
  state.activeModalColor = color;
  document.querySelectorAll('#modalColorPicker .color-radio').forEach(r => {
    if (r.getAttribute('data-color') === color) {
      r.classList.add('active');
    } else {
      r.classList.remove('active');
    }
  });
}

function selectQuickColor(color) {
  state.activeQuickColor = color;
  document.querySelectorAll('#quickColorPicker .color-dot-choice').forEach(d => {
    if (d.getAttribute('data-color') === color) {
      d.classList.add('selected');
    } else {
      d.classList.remove('selected');
    }
  });
}

// ============================================================================
// Event Listeners Setup
// ============================================================================

function setupEventListeners() {
  // Brand logo click resets filters
  elements.brandLogoBtn.addEventListener('click', () => {
    state.currentCategory = 'all';
    state.searchQuery = '';
    elements.searchInput.value = '';
    elements.searchClearBtn.style.display = 'none';
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.cat-pill[data-category="all"]').classList.add('active');
    applyFiltersAndRender();
  });

  // Dark/Light Theme Toggle
  elements.themeToggleBtn.addEventListener('click', () => {
    const nextTheme = state.activeTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });

  // Settings Modal openers
  elements.openSettingsBtn.addEventListener('click', () => openSettingsModal());
  elements.cloudStatusBtn.addEventListener('click', () => openSettingsModal());
  elements.bannerConnectBtn.addEventListener('click', () => openSettingsModal());

  elements.bannerDismissBtn.addEventListener('click', () => {
    elements.firebaseNoticeBanner.style.display = 'none';
    sessionStorage.setItem('cloud_notes_banner_dismissed', 'true');
  });

  // Quick Note Expand / Collapse
  elements.quickNoteCollapsed.addEventListener('click', () => {
    elements.quickNoteCollapsed.style.display = 'none';
    elements.quickNoteExpanded.classList.add('active');
    elements.quickNoteTitle.focus();
  });

  elements.quickNoteCancelBtn.addEventListener('click', () => {
    collapseQuickNote();
  });

  // Click outside quick note to collapse if empty
  document.addEventListener('click', (e) => {
    if (!elements.quickNoteCard.contains(e.target) && elements.quickNoteExpanded.classList.contains('active')) {
      if (!elements.quickNoteTitle.value.trim() && !elements.quickNoteBody.value.trim()) {
        collapseQuickNote();
      }
    }
  });

  function collapseQuickNote() {
    elements.quickNoteExpanded.classList.remove('active');
    elements.quickNoteCollapsed.style.display = 'flex';
    elements.quickNoteTitle.value = '';
    elements.quickNoteBody.value = '';
    selectQuickColor('default');
  }

  // Quick Color Picker
  elements.quickColorPicker.addEventListener('click', (e) => {
    const target = e.target.closest('.color-dot-choice');
    if (target) {
      selectQuickColor(target.getAttribute('data-color'));
    }
  });

  // Quick Note Form Submit
  elements.quickNoteExpanded.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = elements.quickNoteTitle.value;
    const content = elements.quickNoteBody.value;
    const category = elements.quickNoteCategory.value;
    const color = state.activeQuickColor;

    handleCreateNote({ title, content, category, color, isPinned: false });
    collapseQuickNote();
  });

  // Category Pills
  elements.categoryFilterContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.cat-pill');
    if (pill) {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentCategory = pill.getAttribute('data-category');
      applyFiltersAndRender();
    }
  });

  // Sort dropdown
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    applyFiltersAndRender();
  });

  // Search input & clear
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    elements.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
    applyFiltersAndRender();
  });

  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClearBtn.style.display = 'none';
    elements.searchInput.focus();
    applyFiltersAndRender();
  });

  // New Note Modal Triggers
  elements.openNewNoteModalBtn.addEventListener('click', () => openNoteModal());
  elements.emptyStateCreateBtn.addEventListener('click', () => openNoteModal());

  // Note Modal Color Picker
  elements.modalColorPicker.addEventListener('click', (e) => {
    const radio = e.target.closest('.color-radio');
    if (radio) {
      selectModalColor(radio.getAttribute('data-color'));
    }
  });

  // Note Modal Form Submit
  elements.noteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = elements.noteFormId.value;
    const title = elements.modalNoteTitle.value;
    const content = elements.modalNoteContent.value;
    const category = elements.modalNoteCategory.value;
    const isPinned = elements.modalNotePinned.checked;
    const color = state.activeModalColor;

    if (id) {
      handleUpdateNote(id, { title, content, category, color, isPinned });
    } else {
      handleCreateNote({ title, content, category, color, isPinned });
    }

    closeModal(elements.noteModalBackdrop);
  });

  // Modal Closers
  elements.noteModalCloseBtn.addEventListener('click', () => closeModal(elements.noteModalBackdrop));
  elements.modalCancelBtn.addEventListener('click', () => closeModal(elements.noteModalBackdrop));

  elements.settingsModalCloseBtn.addEventListener('click', () => closeModal(elements.settingsModalBackdrop));
  elements.settingsCancelBtn.addEventListener('click', () => closeModal(elements.settingsModalBackdrop));

  elements.deleteModalCloseBtn.addEventListener('click', () => closeModal(elements.deleteModalBackdrop));
  elements.cancelDeleteBtn.addEventListener('click', () => closeModal(elements.deleteModalBackdrop));

  // Confirm Note Deletion
  elements.confirmDeleteBtn.addEventListener('click', () => {
    if (state.noteToDeleteId) {
      handleDeleteNote(state.noteToDeleteId);
      state.noteToDeleteId = null;
    }
    closeModal(elements.deleteModalBackdrop);
  });

  // Close modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(elements.noteModalBackdrop);
      closeModal(elements.settingsModalBackdrop);
      closeModal(elements.deleteModalBackdrop);
    }
  });

  // Close modals when clicking backdrop
  [elements.noteModalBackdrop, elements.settingsModalBackdrop, elements.deleteModalBackdrop].forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop);
      }
    });
  });

  // Settings Tabs switching
  document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Save Settings Clicked
  elements.saveFirebaseSettingsBtn.addEventListener('click', () => handleSaveFirebaseSettings());

  // Use Demo Mode Clicked
  elements.useDemoModeBtn.addEventListener('click', () => {
    localStorage.removeItem('cloud_notes_firebase_config');
    initDemoMode(false);
    closeModal(elements.settingsModalBackdrop);
    showToast('Switched to Demo Mode (Local Storage)', 'info');
  });
}

// ============================================================================
// Firebase Settings Logic
// ============================================================================

function openSettingsModal() {
  const currentConfig = getEffectiveConfig();
  if (currentConfig) {
    elements.cfgApiKey.value = currentConfig.apiKey || '';
    elements.cfgProjectId.value = currentConfig.projectId || '';
    elements.cfgAuthDomain.value = currentConfig.authDomain || '';
    elements.cfgStorageBucket.value = currentConfig.storageBucket || '';
    elements.cfgAppId.value = currentConfig.appId || '';
  }
  openModal(elements.settingsModalBackdrop);
}

function handleSaveFirebaseSettings() {
  let newConfig = null;

  // Check snippet tab first
  const snippet = elements.firebaseConfigSnippet.value.trim();
  if (snippet) {
    newConfig = parseFirebaseConfigSnippet(snippet);
    if (!newConfig) {
      showToast('Could not parse the pasted config. Please check format or use Manual Fields.', 'error');
      return;
    }
  } else {
    // Check manual fields
    const apiKey = elements.cfgApiKey.value.trim();
    const projectId = elements.cfgProjectId.value.trim();
    if (!apiKey || !projectId) {
      showToast('Please provide at least an API Key and Project ID', 'warning');
      return;
    }
    newConfig = {
      apiKey: apiKey,
      projectId: projectId,
      authDomain: elements.cfgAuthDomain.value.trim() || `${projectId}.firebaseapp.com`,
      storageBucket: elements.cfgStorageBucket.value.trim() || `${projectId}.appspot.com`,
      appId: elements.cfgAppId.value.trim() || ''
    };
  }

  // Save to localStorage
  try {
    localStorage.setItem('cloud_notes_firebase_config', JSON.stringify(newConfig));
    closeModal(elements.settingsModalBackdrop);
    showToast('Firebase configuration saved! Connecting...', 'info');

    // Reinitialize Firebase
    initFirebaseOrDemo();
  } catch (err) {
    showToast('Failed to save configuration: ' + err.message, 'error');
  }
}

/**
 * Parses either a JSON string or JS object snippet like:
 * const firebaseConfig = { apiKey: "...", projectId: "..." };
 */
function parseFirebaseConfigSnippet(text) {
  try {
    // Try pure JSON
    return JSON.parse(text);
  } catch (e) {
    // Try extracting key-values via regex
    const extract = (key) => {
      const match = text.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
      return match ? match[1] : '';
    };

    const apiKey = extract('apiKey');
    const projectId = extract('projectId');
    const authDomain = extract('authDomain');
    const storageBucket = extract('storageBucket');
    const messagingSenderId = extract('messagingSenderId');
    const appId = extract('appId');

    if (apiKey && projectId) {
      return {
        apiKey,
        projectId,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        storageBucket: storageBucket || `${projectId}.appspot.com`,
        messagingSenderId,
        appId
      };
    }
  }
  return null;
}

// ============================================================================
// Utilities
// ============================================================================

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  } else {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatRelativeDate(dateObj) {
  if (!dateObj) return 'Just now';
  const date = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
