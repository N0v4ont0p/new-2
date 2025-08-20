// Photo Gallery Application - Apple-style JavaScript
class PhotoGallery {
    constructor() {
        this.currentView = 'gallery';
        this.isLoggedIn = false;
        this.collections = [];
        this.photos = [];
        this.selectedCollection = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadCollections();
        this.loadPhotos();
        this.showGalleryView();
    }
    
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('galleryBtn').addEventListener('click', () => this.showGalleryView());
        document.getElementById('adminBtn').addEventListener('click', () => this.showAdminView());
        
        // Admin login
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // Collection management
        document.getElementById('addCollectionBtn').addEventListener('click', () => this.createCollection());
        
        // Photo upload
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadPhotos());
        
        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());
        
        // Modal close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }
    
    // View Management
    showGalleryView() {
        this.currentView = 'gallery';
        this.updateNavigation();
        
        document.getElementById('gallerySection').classList.remove('hidden');
        document.getElementById('adminSection').classList.add('hidden');
        
        this.loadPhotos();
        this.loadCollections();
    }
    
    showAdminView() {
        if (!this.isLoggedIn) {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('adminPanel').classList.add('hidden');
        } else {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
        }
        
        this.currentView = 'admin';
        this.updateNavigation();
        
        document.getElementById('gallerySection').classList.add('hidden');
        document.getElementById('adminSection').classList.remove('hidden');
        
        if (this.isLoggedIn) {
            this.loadCollections();
            this.loadPhotos();
        }
    }
    
    updateNavigation() {
        const galleryBtn = document.getElementById('galleryBtn');
        const adminBtn = document.getElementById('adminBtn');
        
        galleryBtn.classList.toggle('active', this.currentView === 'gallery');
        adminBtn.classList.toggle('active', this.currentView === 'admin');
    }
    
    // Authentication
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            this.isLoggedIn = data.authenticated;
            
            if (this.isLoggedIn) {
                document.getElementById('logoutBtn').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        }
    }
    
    async handleLogin() {
        const password = document.getElementById('passwordInput').value;
        
        if (!password) {
            this.showNotification('Please enter a password', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.isLoggedIn = true;
                this.showNotification('Login successful!', 'success');
                
                document.getElementById('loginForm').classList.add('hidden');
                document.getElementById('adminPanel').classList.remove('hidden');
                document.getElementById('logoutBtn').classList.remove('hidden');
                
                this.loadCollections();
                this.loadPhotos();
            } else {
                this.showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }
    
    async handleLogout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.isLoggedIn = false;
                this.showNotification('Logged out successfully', 'success');
                
                document.getElementById('loginForm').classList.remove('hidden');
                document.getElementById('adminPanel').classList.add('hidden');
                document.getElementById('logoutBtn').classList.add('hidden');
                document.getElementById('passwordInput').value = '';
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Collections Management
    async loadCollections() {
        try {
            const response = await fetch('/api/collections');
            const data = await response.json();
            
            if (data.success) {
                this.collections = data.collections;
                this.renderCollections();
                this.updateCollectionOptions();
            }
        } catch (error) {
            console.error('Error loading collections:', error);
        }
    }
    
    renderCollections() {
        const galleryGrid = document.getElementById('collectionsGrid');
        const adminGrid = document.getElementById('adminCollectionsGrid');
        
        if (this.collections.length === 0) {
            const emptyState = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <h3 class="empty-state-title">No Collections Yet</h3>
                    <p class="empty-state-text">Create your first collection to organize your photos</p>
                </div>
            `;
            galleryGrid.innerHTML = emptyState;
            if (adminGrid) adminGrid.innerHTML = emptyState;
            return;
        }
        
        const collectionsHTML = this.collections.map(collection => `
            <div class="collection-card" onclick="photoGallery.viewCollection(${collection.id})">
                <h3 class="collection-name">${this.escapeHtml(collection.name)}</h3>
                <p class="collection-count">
                    <span>📸</span>
                    ${collection.photo_count} ${collection.photo_count === 1 ? 'photo' : 'photos'}
                </p>
            </div>
        `).join('');
        
        galleryGrid.innerHTML = collectionsHTML;
        
        if (adminGrid) {
            const adminCollectionsHTML = this.collections.map(collection => `
                <div class="collection-card">
                    <h3 class="collection-name">${this.escapeHtml(collection.name)}</h3>
                    <p class="collection-count">
                        <span>📸</span>
                        ${collection.photo_count} ${collection.photo_count === 1 ? 'photo' : 'photos'}
                    </p>
                    <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center;">
                        <button class="btn btn-secondary" onclick="photoGallery.viewCollection(${collection.id})">
                            View Photos
                        </button>
                        <button class="btn btn-danger" onclick="photoGallery.deleteCollection(${collection.id})">
                            Delete
                        </button>
                    </div>
                </div>
            `).join('');
            
            adminGrid.innerHTML = adminCollectionsHTML;
        }
    }
    
    updateCollectionOptions() {
        const select = document.getElementById('collectionSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">No Collection</option>';
        
        this.collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.id;
            option.textContent = collection.name;
            select.appendChild(option);
        });
    }
    
    async createCollection() {
        const name = document.getElementById('collectionNameInput').value.trim();
        
        if (!name) {
            this.showNotification('Please enter a collection name', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Collection created successfully!', 'success');
                document.getElementById('collectionNameInput').value = '';
                this.loadCollections();
            } else {
                this.showNotification(data.error || 'Failed to create collection', 'error');
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            this.showNotification('Failed to create collection', 'error');
        }
    }
    
    async deleteCollection(collectionId) {
        if (!confirm('Are you sure you want to delete this collection? Photos will not be deleted, just unassigned.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/collections/${collectionId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Collection deleted successfully!', 'success');
                this.loadCollections();
                this.loadPhotos();
            } else {
                this.showNotification(data.error || 'Failed to delete collection', 'error');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            this.showNotification('Failed to delete collection', 'error');
        }
    }
    
    async viewCollection(collectionId) {
        this.selectedCollection = collectionId;
        const collection = this.collections.find(c => c.id === collectionId);
        
        if (collection) {
            // Update the gallery title
            const galleryTitle = document.querySelector('#gallerySection .section-title');
            galleryTitle.textContent = collection.name;
            
            // Add back button
            const gallerySubtitle = document.querySelector('#gallerySection .section-subtitle');
            gallerySubtitle.innerHTML = `
                <button class="btn btn-secondary" onclick="photoGallery.showAllPhotos()" style="margin-bottom: 16px;">
                    ← Back to All Photos
                </button>
                <br>
                ${collection.photo_count} ${collection.photo_count === 1 ? 'photo' : 'photos'} in this collection
            `;
            
            // Load photos for this collection
            this.loadPhotos(collectionId);
            
            // Switch to gallery view if not already there
            if (this.currentView !== 'gallery') {
                this.showGalleryView();
            }
        }
    }
    
    showAllPhotos() {
        this.selectedCollection = null;
        
        // Reset gallery title
        const galleryTitle = document.querySelector('#gallerySection .section-title');
        galleryTitle.textContent = 'Photo Gallery';
        
        const gallerySubtitle = document.querySelector('#gallerySection .section-subtitle');
        gallerySubtitle.textContent = 'Beautiful moments captured and organized';
        
        this.loadPhotos();
    }
    
    // Photos Management
    async loadPhotos(collectionId = null) {
        try {
            const url = collectionId ? `/api/photos?collection_id=${collectionId}` : '/api/photos';
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.photos = data.photos;
                this.renderPhotos();
            }
        } catch (error) {
            console.error('Error loading photos:', error);
        }
    }
    
    renderPhotos() {
        const photosGrid = document.getElementById('photosGrid');
        
        if (this.photos.length === 0) {
            const emptyState = `
                <div class="empty-state">
                    <div class="empty-state-icon">📷</div>
                    <h3 class="empty-state-title">No Photos Yet</h3>
                    <p class="empty-state-text">Upload your first photos to get started</p>
                </div>
            `;
            photosGrid.innerHTML = emptyState;
            return;
        }
        
        const photosHTML = this.photos.map(photo => `
            <div class="photo-item" onclick="photoGallery.viewPhoto('${photo.cloudinary_url}', '${this.escapeHtml(photo.title)}')">
                <img src="${photo.cloudinary_url}" alt="${this.escapeHtml(photo.title)}" loading="lazy">
                <div class="photo-info">
                    <h3 class="photo-title">${this.escapeHtml(photo.title)}</h3>
                    ${photo.description ? `<p class="photo-description">${this.escapeHtml(photo.description)}</p>` : ''}
                </div>
            </div>
        `).join('');
        
        photosGrid.innerHTML = photosHTML;
    }
    
    viewPhoto(imageUrl, title) {
        const modal = document.getElementById('photoModal');
        const modalImg = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        
        modalImg.src = imageUrl;
        modalTitle.textContent = title;
        
        modal.classList.add('active');
    }
    
    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('active'));
    }
    
    // File Upload
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.processFiles(files);
    }
    
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        
        const files = Array.from(event.dataTransfer.files);
        this.processFiles(files);
    }
    
    processFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showNotification('Please select image files only', 'error');
            return;
        }
        
        if (imageFiles.length > 10) {
            this.showNotification('Maximum 10 files allowed at once', 'error');
            return;
        }
        
        // Update UI to show selected files
        const uploadText = document.querySelector('.upload-text');
        uploadText.textContent = `${imageFiles.length} file${imageFiles.length > 1 ? 's' : ''} selected`;
        
        // Store files for upload
        this.selectedFiles = imageFiles;
    }
    
    async uploadPhotos() {
        if (!this.selectedFiles || this.selectedFiles.length === 0) {
            this.showNotification('Please select files first', 'error');
            return;
        }
        
        const collectionId = document.getElementById('collectionSelect').value;
        const formData = new FormData();
        
        // Add files
        this.selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        // Add metadata
        this.selectedFiles.forEach(file => {
            formData.append('titles', file.name.split('.')[0]);
            formData.append('descriptions', '');
        });
        
        if (collectionId) {
            formData.append('collection_id', collectionId);
        }
        
        try {
            // Show loading state
            const uploadBtn = document.getElementById('uploadBtn');
            const originalText = uploadBtn.textContent;
            uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
            uploadBtn.disabled = true;
            
            const response = await fetch('/api/photos', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`Successfully uploaded ${data.photos.length} photo${data.photos.length > 1 ? 's' : ''}!`, 'success');
                
                // Reset form
                document.getElementById('fileInput').value = '';
                document.getElementById('collectionSelect').value = '';
                document.querySelector('.upload-text').textContent = 'Drag and drop photos here';
                this.selectedFiles = [];
                
                // Reload data
                this.loadPhotos();
                this.loadCollections();
            } else {
                this.showNotification(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed. Please try again.', 'error');
        } finally {
            // Reset button
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }
    }
    
    // Utility Functions
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-text">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application
let photoGallery;

document.addEventListener('DOMContentLoaded', () => {
    photoGallery = new PhotoGallery();
});

