// Photo Gallery Application - Clean and Functional
class PhotoGallery {
    constructor() {
        this.currentView = 'gallery';
        this.isLoggedIn = false;
        this.collections = [];
        this.photos = [];
        this.selectedCollection = null;
        this.selectedFiles = [];
        
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
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // Admin login
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        // Collection management
        document.getElementById('addCollectionBtn').addEventListener('click', () => this.createCollection());
        document.getElementById('collectionNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createCollection();
        });
        
        // Photo upload
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadPhotos());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());
        
        // Modal close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
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
                
                // Switch to gallery view
                this.showGalleryView();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // View Management
    showGalleryView() {
        this.currentView = 'gallery';
        this.updateNavigation();
        
        document.getElementById('gallerySection').classList.remove('hidden');
        document.getElementById('adminSection').classList.add('hidden');
        
        if (this.selectedCollection) {
            this.showCollectionView();
        } else {
            this.showMainGallery();
        }
    }
    
    showMainGallery() {
        this.selectedCollection = null;
        
        // Update gallery title
        const galleryTitle = document.querySelector('#gallerySection .section-title');
        galleryTitle.textContent = 'Photo Gallery';
        
        const gallerySubtitle = document.querySelector('#gallerySection .section-subtitle');
        gallerySubtitle.textContent = 'Beautiful moments captured and organized';
        
        // Show collections grid, hide photos grid
        document.getElementById('collectionsGrid').classList.remove('hidden');
        document.getElementById('photosGrid').classList.add('hidden');
        
        this.loadCollections();
    }
    
    showCollectionView() {
        const collection = this.collections.find(c => c.id === this.selectedCollection);
        if (!collection) return;
        
        // Update gallery title
        const galleryTitle = document.querySelector('#gallerySection .section-title');
        galleryTitle.textContent = collection.name;
        
        const gallerySubtitle = document.querySelector('#gallerySection .section-subtitle');
        gallerySubtitle.innerHTML = `
            <button class="btn btn-secondary" onclick="photoGallery.showMainGallery()" style="margin-bottom: 16px;">
                ← Back to Collections
            </button>
            <br>
            ${collection.photo_count} ${collection.photo_count === 1 ? 'photo' : 'photos'} in this collection
        `;
        
        // Hide collections grid, show photos grid
        document.getElementById('collectionsGrid').classList.add('hidden');
        document.getElementById('photosGrid').classList.remove('hidden');
        
        this.loadPhotos(this.selectedCollection);
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
        } else {
            const collectionsHTML = this.collections.map(collection => `
                <div class="collection-card" onclick="photoGallery.viewCollection('${collection.id}')">
                    <h3 class="collection-name">${this.escapeHtml(collection.name)}</h3>
                    <p class="collection-count">
                        <span>📸</span>
                        Collection
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
                            Collection
                        </p>
                        <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center;">
                            <button class="btn btn-secondary" onclick="photoGallery.viewCollection('${collection.id}')">
                                View Photos
                            </button>
                            <button class="btn btn-danger" onclick="photoGallery.deleteCollection('${collection.id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('');
                
                adminGrid.innerHTML = adminCollectionsHTML;
            }
        }
        
        // Handle uncategorized photos separately
        this.renderUncategorizedPhotos();
    }
    
    renderUncategorizedPhotos() {
        // Load all photos to check for uncategorized ones
        fetch('/api/photos')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const uncategorizedPhotos = data.photos.filter(photo => 
                        !photo.cloudinary_folder || photo.cloudinary_folder === 'uncategorized'
                    );
                    
                    const uncategorizedSection = document.getElementById('uncategorizedSection');
                    const uncategorizedGrid = document.getElementById('uncategorizedGrid');
                    
                    if (uncategorizedPhotos.length > 0) {
                        uncategorizedSection.classList.remove('hidden');
                        
                        const photosHTML = uncategorizedPhotos.map(photo => `
                            <div class="photo-item" onclick="photoGallery.viewPhoto('${photo.cloudinary_secure_url}', 'Photo', ${photo.id})">
                                <img src="${photo.cloudinary_secure_url}" alt="Photo" loading="lazy">
                            </div>
                        `).join('');
                        
                        uncategorizedGrid.innerHTML = photosHTML;
                    } else {
                        uncategorizedSection.classList.add('hidden');
                    }
                }
            })
            .catch(error => {
                console.error('Error loading uncategorized photos:', error);
            });
    }
    
    updateCollectionOptions() {
        const select = document.getElementById('collectionSelect');
        const moveSelect = document.getElementById('moveToCollectionSelect');
        
        if (select) {
            select.innerHTML = '<option value="">No Collection</option>';
            this.collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.id;
                option.textContent = collection.name;
                select.appendChild(option);
            });
        }
        
        if (moveSelect) {
            moveSelect.innerHTML = '<option value="">Move to Collection...</option>';
            this.collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.id;
                option.textContent = collection.name;
                moveSelect.appendChild(option);
            });
        }
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
        if (!confirm('Are you sure you want to delete this collection? All photos in this collection will be permanently deleted.')) {
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
                
                // If we're viewing the deleted collection, go back to main gallery
                if (this.selectedCollection === collectionId) {
                    this.showMainGallery();
                }
            } else {
                this.showNotification(data.error || 'Failed to delete collection', 'error');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            this.showNotification('Failed to delete collection', 'error');
        }
    }
    
    viewCollection(collectionId) {
        this.selectedCollection = collectionId;
        
        if (this.currentView === 'gallery') {
            this.showCollectionView();
        } else {
            // Switch to gallery view and show collection
            this.showGalleryView();
        }
    }
    
    // Photos Management
    async loadPhotos(collectionId = null) {
        try {
            let url = '/api/photos';
            if (collectionId && collectionId !== 'uncategorized') {
                url = `/api/photos?collection_id=${collectionId}`;
            } else if (collectionId === 'uncategorized') {
                // Load all photos and filter uncategorized on frontend
                url = '/api/photos';
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                if (collectionId === 'uncategorized') {
                    // Filter uncategorized photos
                    this.photos = data.photos.filter(photo => !photo.cloudinary_folder || photo.cloudinary_folder === 'uncategorized');
                } else {
                    this.photos = data.photos;
                }
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
            <div class="photo-item" onclick="photoGallery.viewPhoto('${photo.cloudinary_secure_url}', 'Photo', ${photo.id})">
                <img src="${photo.cloudinary_secure_url}" alt="Photo" loading="lazy">
            </div>
        `).join('');
        
        photosGrid.innerHTML = photosHTML;
    }
    
    viewPhoto(imageUrl, title, photoId = null) {
        const modal = document.getElementById('photoModal');
        const modalImg = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        const downloadBtn = document.getElementById('downloadBtn');
        const adminActions = document.getElementById('adminPhotoActions');
        
        modalImg.src = imageUrl;
        modalTitle.textContent = title;
        
        // Set up download button
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = 'photo.jpg';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        // Show admin actions if logged in and photoId is provided
        if (this.isLoggedIn && photoId) {
            adminActions.classList.remove('hidden');
            this.currentPhotoId = photoId;
            this.setupPhotoManagement();
        } else {
            adminActions.classList.add('hidden');
        }
        
        modal.classList.add('active');
    }
    
    setupPhotoManagement() {
        const moveSelect = document.getElementById('moveToCollectionSelect');
        const uncategorizeBtn = document.getElementById('uncategorizeBtn');
        const deleteBtn = document.getElementById('deletePhotoBtn');
        
        // Move to collection
        moveSelect.onchange = async () => {
            const collectionId = moveSelect.value;
            if (collectionId && this.currentPhotoId) {
                await this.movePhotoToCollection(this.currentPhotoId, collectionId);
                moveSelect.value = '';
            }
        };
        
        // Uncategorize photo
        uncategorizeBtn.onclick = async () => {
            if (this.currentPhotoId) {
                await this.uncategorizePhoto(this.currentPhotoId);
            }
        };
        
        // Delete photo
        deleteBtn.onclick = async () => {
            if (this.currentPhotoId && confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
                await this.deletePhoto(this.currentPhotoId);
            }
        };
    }
    
    async movePhotoToCollection(photoId, collectionId) {
        try {
            const response = await fetch(`/api/photos/${photoId}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ collection_id: collectionId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Photo moved successfully!', 'success');
                this.closeModal();
                this.loadPhotos();
                this.loadCollections();
                this.renderUncategorizedPhotos();
            } else {
                this.showNotification(data.error || 'Failed to move photo', 'error');
            }
        } catch (error) {
            console.error('Error moving photo:', error);
            this.showNotification('Failed to move photo', 'error');
        }
    }
    
    async uncategorizePhoto(photoId) {
        try {
            const response = await fetch(`/api/photos/${photoId}/uncategorize`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Photo uncategorized successfully!', 'success');
                this.closeModal();
                this.loadPhotos();
                this.loadCollections();
                this.renderUncategorizedPhotos();
            } else {
                this.showNotification(data.error || 'Failed to uncategorize photo', 'error');
            }
        } catch (error) {
            console.error('Error uncategorizing photo:', error);
            this.showNotification('Failed to uncategorize photo', 'error');
        }
    }
    
    async deletePhoto(photoId) {
        try {
            const response = await fetch(`/api/photos/${photoId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Photo deleted successfully!', 'success');
                this.closeModal();
                this.loadPhotos();
                this.loadCollections();
                this.renderUncategorizedPhotos();
            } else {
                this.showNotification(data.error || 'Failed to delete photo', 'error');
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification('Failed to delete photo', 'error');
        }
    }
    
    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('active'));
        this.currentPhotoId = null;
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
        const imageFiles = files.filter(file => 
            file.type.startsWith('image/') || 
            file.name.toLowerCase().endsWith('.heic') || 
            file.name.toLowerCase().endsWith('.heif')
        );
        
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
        
        if (collectionId) {
            formData.append('collection_id', collectionId);
        }
        
        try {
            // Show loading state
            const uploadBtn = document.getElementById('uploadBtn');
            const originalText = uploadBtn.textContent;
            uploadBtn.textContent = 'Uploading...';
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
                if (data.details) {
                    console.error('Upload details:', data.details);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed. Please try again.', 'error');
        } finally {
            // Reset button
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.textContent = 'Upload Photos';
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

