// LinkedIn Private Notes Extension - Content Script

class LinkedInNotesExtension {
  constructor() {
    this.notesContainer = null;
    this.currentProfileId = null;
    this.notesData = new Map();
    this.fileHandle = null;
    this.init();
  }

  init() {
    console.log('LinkedIn Notes Extension: Initializing...');
    console.log('Current URL:', window.location.href);
    
    // Check if notes container already exists
    if (document.getElementById('linkedin-notes-container')) {
      console.log('LinkedIn Notes Extension: Already initialized, skipping...');
      return;
    }
    
    // Wait for page to load and check if it's a profile page
    if (this.isProfilePage()) {
      console.log('LinkedIn Notes Extension: Profile page detected');
      this.currentProfileId = this.extractProfileId();
      console.log('Profile ID:', this.currentProfileId);
      
      this.loadNotesData().then(() => {
        this.createNotesSection();
        this.setupMutationObserver();
      });
    } else {
      console.log('LinkedIn Notes Extension: Not a profile page');
    }
  }

  isProfilePage() {
    return window.location.pathname.startsWith('/in/') && 
           !window.location.pathname.includes('/edit/') &&
           !window.location.pathname.includes('/recent-activity/');
  }

  extractProfileId() {
    const pathParts = window.location.pathname.split('/');
    const profileId = pathParts[2]; // /in/username format
    return profileId || 'unknown';
  }

  async loadNotesData() {
    try {
      // Try to load from File System Access API first
      const fileData = await this.loadFromFile();
      if (fileData) {
        this.notesData = new Map(Object.entries(fileData));
        return;
      }
    } catch (error) {
      console.log('File System Access not available, using fallback storage');
    }

    // Fallback to chrome.storage.local
    try {
      const result = await chrome.storage.local.get(['linkedinNotes']);
      if (result.linkedinNotes) {
        this.notesData = new Map(Object.entries(result.linkedinNotes));
      }
    } catch (error) {
      console.error('Failed to load notes from storage:', error);
    }
  }

  async saveNotesData() {
    const dataObject = Object.fromEntries(this.notesData);
    
    try {
      // Try File System Access API first
      await this.saveToFile(dataObject);
    } catch (error) {
      console.log('File System Access not available, using fallback storage');
      // Fallback to chrome.storage.local
      try {
        await chrome.storage.local.set({ linkedinNotes: dataObject });
      } catch (storageError) {
        console.error('Failed to save notes to storage:', storageError);
      }
    }
  }

  async loadFromFile() {
    if (!('showOpenFilePicker' in window)) {
      throw new Error('File System Access API not supported');
    }

    try {
      // Try to get existing file handle from storage
      const result = await chrome.storage.local.get(['notesFileHandle']);
      if (result.notesFileHandle) {
        this.fileHandle = result.notesFileHandle;
        const file = await this.fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
      }
    } catch (error) {
      console.log('No existing file handle found or error loading file:', error);
    }
    return null;
  }

  async selectFile() {
    if (!('showOpenFilePicker' in window)) {
      this.showStatus('File System Access API not supported in this browser', 'error');
      return;
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }],
        excludeAcceptAllOption: true
      });

      this.fileHandle = fileHandle;
      
      // Save file handle for future use
      await chrome.storage.local.set({ notesFileHandle: fileHandle });
      
      // Load data from the selected file
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      this.notesData = new Map(Object.entries(data));
      
      // Update UI
      this.updateFileInfo();
      this.loadNotesForProfile();
      this.showStatus('File loaded successfully!', 'success');
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting file:', error);
        this.showStatus('Error loading file: ' + error.message, 'error');
      }
    }
  }

  updateFileInfo() {
    const filePathEl = document.getElementById('file-path');
    if (filePathEl) {
      if (this.fileHandle) {
        filePathEl.textContent = this.fileHandle.name;
        filePathEl.style.color = '#057642';
      } else {
        filePathEl.textContent = 'No file selected';
        filePathEl.style.color = '#666666';
      }
    }
  }

  async saveToFile(data) {
    if (!('showSaveFilePicker' in window)) {
      throw new Error('File System Access API not supported');
    }

    try {
      if (!this.fileHandle) {
        // Create new file
        this.fileHandle = await window.showSaveFilePicker({
          suggestedName: 'linkedin-notes.json',
          types: [{
            description: 'JSON files',
            accept: { 'application/json': ['.json'] }
          }]
        });
        
        // Save file handle for future use
        await chrome.storage.local.set({ notesFileHandle: this.fileHandle });
      }

      const writable = await this.fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to save to file:', error);
        throw error;
      }
    }
  }

  createNotesSection() {
    // Multiple selectors to find the About section or main content area
    const aboutSection = document.querySelector('[data-test-id="about-section"]') || 
                       document.querySelector('.pv-about-section') ||
                       document.querySelector('.pv-about__summary-text')?.closest('section') ||
                       document.querySelector('.pv-about__summary-text')?.closest('div') ||
                       document.querySelector('[data-test-id="about"]') ||
                       document.querySelector('.pv-about') ||
                       document.querySelector('section[aria-labelledby*="about"]') ||
                       document.querySelector('.artdeco-card')?.querySelector('section') ||
                       document.querySelector('.pv-profile-section') ||
                       document.querySelector('.pv-top-card--list-bullet')?.closest('section');

    if (!aboutSection) {
      console.log('About section not found, trying alternative approach...');
      // Try to find any main content section
      const mainContent = document.querySelector('main') || 
                         document.querySelector('.scaffold-layout__main') ||
                         document.querySelector('.application-outlet') ||
                         document.querySelector('#main-content');
      
      if (mainContent) {
        console.log('Found main content, inserting notes at top');
        this.insertNotesInMainContent(mainContent);
        return;
      }
      
      console.log('No suitable insertion point found, retrying...');
      setTimeout(() => this.createNotesSection(), 2000);
      return;
    }

    // Create notes container
    this.notesContainer = document.createElement('div');
    this.notesContainer.id = 'linkedin-notes-container';
    this.notesContainer.className = 'linkedin-notes-section';
    
    this.notesContainer.innerHTML = `
      <div class="linkedin-notes-header">
        <h2 class="linkedin-notes-title">Your Private Notes</h2>
        <div class="linkedin-notes-actions">
          <button id="select-file-btn" class="linkedin-notes-file-btn">Select File</button>
          <button id="save-notes-btn" class="linkedin-notes-save-btn">Save</button>
          <button id="clear-notes-btn" class="linkedin-notes-clear-btn">Clear</button>
        </div>
      </div>
      <div class="linkedin-notes-content">
        <div class="linkedin-notes-file-info" id="file-info">
          <span id="file-path">No file selected</span>
        </div>
        <textarea 
          id="notes-textarea" 
          class="linkedin-notes-textarea" 
          placeholder="Add your private notes about this person..."
          rows="4"
        ></textarea>
        <div class="linkedin-notes-status" id="notes-status"></div>
      </div>
    `;

    // Insert before the About section
    aboutSection.parentNode.insertBefore(this.notesContainer, aboutSection);

    // Load existing notes for this profile
    this.loadNotesForProfile();

    // Set up event listeners
    this.setupEventListeners();
  }

  insertNotesInMainContent(mainContent) {
    // Create notes container
    this.notesContainer = document.createElement('div');
    this.notesContainer.id = 'linkedin-notes-container';
    this.notesContainer.className = 'linkedin-notes-section';
    
    this.notesContainer.innerHTML = `
      <div class="linkedin-notes-header">
        <h2 class="linkedin-notes-title">Your Private Notes</h2>
        <div class="linkedin-notes-actions">
          <button id="select-file-btn" class="linkedin-notes-file-btn">Select File</button>
          <button id="save-notes-btn" class="linkedin-notes-save-btn">Save</button>
          <button id="clear-notes-btn" class="linkedin-notes-clear-btn">Clear</button>
        </div>
      </div>
      <div class="linkedin-notes-content">
        <div class="linkedin-notes-file-info" id="file-info">
          <span id="file-path">No file selected</span>
        </div>
        <textarea 
          id="notes-textarea" 
          class="linkedin-notes-textarea" 
          placeholder="Add your private notes about this person..."
          rows="4"
        ></textarea>
        <div class="linkedin-notes-status" id="notes-status"></div>
      </div>
    `;

    // Insert at the top of main content
    mainContent.insertBefore(this.notesContainer, mainContent.firstChild);

    // Load existing notes for this profile
    this.loadNotesForProfile();

    // Set up event listeners
    this.setupEventListeners();
  }

  loadNotesForProfile() {
    const notes = this.notesData.get(this.currentProfileId) || '';
    const textarea = document.getElementById('notes-textarea');
    if (textarea) {
      textarea.value = notes;
    }
  }

  setupEventListeners() {
    const selectFileBtn = document.getElementById('select-file-btn');
    const saveBtn = document.getElementById('save-notes-btn');
    const clearBtn = document.getElementById('clear-notes-btn');
    const textarea = document.getElementById('notes-textarea');

    if (selectFileBtn) {
      selectFileBtn.addEventListener('click', () => this.selectFile());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveNotes());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearNotes());
    }

    if (textarea) {
      // Auto-save on typing (with debounce)
      let saveTimeout;
      textarea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => this.autoSaveNotes(), 2000);
      });
    }

    // Update file path display
    this.updateFileInfo();
  }

  async saveNotes() {
    const textarea = document.getElementById('notes-textarea');
    if (!textarea) return;

    const notes = textarea.value.trim();
    this.notesData.set(this.currentProfileId, notes);
    await this.saveNotesData();
    this.showStatus('Notes saved successfully!', 'success');
  }

  async clearNotes() {
    const textarea = document.getElementById('notes-textarea');
    if (!textarea) return;

    if (confirm('Are you sure you want to clear all notes for this profile?')) {
      textarea.value = '';
      this.notesData.set(this.currentProfileId, '');
      await this.saveNotesData();
      this.showStatus('Notes cleared', 'info');
    }
  }

  async autoSaveNotes() {
    const textarea = document.getElementById('notes-textarea');
    if (!textarea) return;

    const notes = textarea.value.trim();
    this.notesData.set(this.currentProfileId, notes);
    await this.saveNotesData();
    this.showStatus('Auto-saved', 'info');
  }

  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('notes-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `linkedin-notes-status ${type}`;
      setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'linkedin-notes-status';
      }, 3000);
    }
  }

  setupMutationObserver() {
    // Watch for navigation changes (LinkedIn is a SPA)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if we're still on a profile page
          if (this.isProfilePage()) {
            const newProfileId = this.extractProfileId();
            if (newProfileId !== this.currentProfileId) {
              this.currentProfileId = newProfileId;
              this.loadNotesForProfile();
            }
          } else {
            // Not on a profile page, remove notes section
            if (this.notesContainer && this.notesContainer.parentNode) {
              this.notesContainer.parentNode.removeChild(this.notesContainer);
              this.notesContainer = null;
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize the extension when the page loads
function initializeExtension() {
  // Wait a bit for LinkedIn's dynamic content to load
  setTimeout(() => {
    new LinkedInNotesExtension();
  }, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Also try to initialize when the page becomes visible (for SPA navigation)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(() => {
      if (!document.getElementById('linkedin-notes-container')) {
        new LinkedInNotesExtension();
      }
    }, 500);
  }
});
