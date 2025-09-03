class PhotoGallery {
    constructor() {
        this.collections = [];
        this.photos = [];
        this.currentView = 'gallery';
        this.currentCollectionId = null;
        this.currentPhotoId = null;
        this.isLoggedIn = false;
        this.selectedPhotos = new Set();
        this.massDeleteMode = false;
        
        this.init();
    }
    
    async init() {
        this.showLoading();
        await this.checkAuthStatus();
        await this.loadCollections();
        this.setupEventListeners();
        this.hideLoading();
    }
    
    // Authentication
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            this.isLoggedIn = data.authenticated;
            this.updateAuthUI();
        } catch (error) {
            console.error('Auth check failed:', error);
            this.isLoggedIn = false;
            this.updateAuthUI();
        }
    }
    
    async login() {
        const password = document.getElementById('adminPassword').value;
        if (!password) {
            this.showNotification('Please enter password', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            if (data.success) {
                this.isLoggedIn = true;
                this.updateAuthUI();
                this.showNotification('Login successful!', 'success');
                document.getElementById('adminPassword').value = '';
            } else {
                this.showNotification('Invalid password', 'error');
            }
        } catch (error) {
            console.error('Login failed:', error);
            this.showNotification('Login failed', 'error');
        }
    }
    
    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.isLoggedIn = false;
            this.updateAuthUI();
            this.showNotification('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }
    
    updateAuthUI() {
        const loginForm = document.getElementById('loginForm');
        const adminDashboard = document.getElementById('adminDashboard');
        const adminPhotoActions = document.getElementById('adminPhotoActions');
        const massDeleteBtn = document.getElementById('massDeleteBtn');
        const collectionActions = document.querySelectorAll('.collection-actions');
        
        if (this.isLoggedIn) {
            loginForm.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
            adminPhotoActions.classList.remove('hidden');
            massDeleteBtn.classList.remove('hidden');
            collectionActions.forEach(action => action.classList.remove('hidden'));
        } else {
            loginForm.classList.remove('hidden');
            adminDashboard.classList.add('hidden');
            adminPhotoActions.classList.add('hidden');
            massDeleteBtn.classList.add('hidden');
            collectionActions.forEach(action => action.classList.add('hidden'));
        }
        
        this.updateCollectionOptions();
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
            this.showNotification('Failed to load collections', 'error');
        }
    }
    
    renderCollections() {
        const grid = document.getElementById('collectionsGrid');
        
        if (this.collections.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <h3 class="empty-state-title">No Collections Yet</h3>
                    <p class="empty-state-text">Create your first collection to organize your photos</p>
                </div>
            `;
            return;
        }
        
        const collectionsHTML = this.collections.map(collection => `
            <div class="collection-card" onclick="photoGallery.viewCollection('${collection.id}')">
                <div class="collection-preview">
                    ${collection.preview_image ? 
                        `<img src="${collection.preview_image}" alt="${collection.name}">` : 
                        '📷'
                    }
                </div>
                <div class="collection-info">
                    <h3 class="collection-name">${collection.name}</h3>
                    <p class="collection-meta">Collection</p>
                </div>
                ${this.isLoggedIn ? `
                    <div class="collection-actions">
                        <button class="collection-delete" onclick="event.stopPropagation(); photoGallery.deleteCollection('${collection.id}')">
                            ×
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        grid.innerHTML = collectionsHTML;
    }
    
    async createCollection() {
        const name = document.getElementById('collectionNameInput').value.trim();
        if (!name) {
            this.showNotification('Please enter collection name', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification('Collection created successfully!', 'success');
                document.getElementById('collectionNameInput').value = '';
                await this.loadCollections();
            } else {
                this.showNotification(data.message || 'Failed to create collection', 'error');
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            this.showNotification('Failed to create collection', 'error');
        }
    }
    
    async deleteCollection(collectionId) {
        if (!confirm('Are you sure you want to delete this collection? All photos in it will be permanently deleted.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/collections/${collectionId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification('Collection deleted successfully!', 'success');
                await this.loadCollections();
            } else {
                this.showNotification(data.message || 'Failed to delete collection', 'error');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            this.showNotification('Failed to delete collection', 'error');
        }
    }
    
    // Collection View
    async viewCollection(collectionId) {
        try {
            this.showLoading();
            const response = await fetch(`/api/photos?collection_id=${collectionId}`);
            const data = await response.json();
            
            if (data.success) {
                // Filter to only photos that belong to this exact collection
                this.photos = data.photos.filter(photo => 
                    photo &&
                    photo.id &&
                    photo.cloudinary_secure_url &&
                    photo.cloudinary_secure_url !== 'undefined' &&
                    photo.cloudinary_secure_url.startsWith('http') &&
                    photo.cloudinary_folder === collectionId
                );
                
                this.currentCollectionId = collectionId;
                this.currentView = 'collection';
                this.showCollectionView();
            }
        } catch (error) {
            console.error('Error loading collection:', error);
            this.showNotification('Failed to load collection', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showCollectionView() {
        // Hide gallery view
        document.getElementById('gallerySection').classList.add('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
        
        // Show collection view
        document.getElementById('collectionSection').classList.remove('hidden');
        
        // Update navigation
        document.getElementById('galleryBtn').classList.remove('active');
        document.getElementById('adminBtn').classList.remove('active');
        
        // Update collection title
        const collection = this.collections.find(c => c.id === this.currentCollectionId);
        const title = document.getElementById('collectionTitle');
        if (title && collection) {
            title.textContent = collection.name;
        }
        
        // Show/hide mass delete controls
        const selectAllBtn = document.getElementById('selectAllBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        
        if (this.isLoggedIn) {
            selectAllBtn.classList.remove('hidden');
            deleteSelectedBtn.classList.remove('hidden');
        } else {
            selectAllBtn.classList.add('hidden');
            deleteSelectedBtn.classList.add('hidden');
        }
        
        this.renderCollectionPhotos();
    }
    
    renderCollectionPhotos() {
        const grid = document.getElementById('collectionPhotosGrid');
        
        if (this.photos.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📷</div>
                    <h3 class="empty-state-title">No Photos in Collection</h3>
                    <p class="empty-state-text">Upload photos to this collection to see them here</p>
                </div>
            `;
            return;
        }
        
        const photosHTML = this.photos.map(photo => `
            <div class="photo-item" onclick="photoGallery.viewPhoto('${photo.cloudinary_secure_url}', '${photo.filename || 'Photo'}', ${photo.id})">
                <img src="${photo.cloudinary_secure_url}" alt="Photo" loading="lazy">
                ${this.isLoggedIn && this.massDeleteMode ? `
                    <div class="photo-checkbox ${this.selectedPhotos.has(photo.id) ? 'checked' : ''}" 
                         onclick="event.stopPropagation(); photoGallery.togglePhotoSelection(${photo.id})">
                        ${this.selectedPhotos.has(photo.id) ? '✓' : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        grid.innerHTML = photosHTML;
    }
    
    // Photo Management
    togglePhotoSelection(photoId) {
        if (this.selectedPhotos.has(photoId)) {
            this.selectedPhotos.delete(photoId);
        } else {
            this.selectedPhotos.add(photoId);
        }
        this.renderCollectionPhotos();
        this.updateDeleteSelectedButton();
    }
    
    selectAllPhotos() {
        if (this.selectedPhotos.size === this.photos.length) {
            // Deselect all
            this.selectedPhotos.clear();
        } else {
            // Select all
            this.photos.forEach(photo => this.selectedPhotos.add(photo.id));
        }
        this.renderCollectionPhotos();
        this.updateDeleteSelectedButton();
    }
    
    updateDeleteSelectedButton() {
        const btn = document.getElementById('deleteSelectedBtn');
        const selectAllBtn = document.getElementById('selectAllBtn');
        
        if (this.selectedPhotos.size > 0) {
            btn.textContent = `Delete Selected (${this.selectedPhotos.size})`;
            btn.disabled = false;
        } else {
            btn.textContent = 'Delete Selected';
            btn.disabled = true;
        }
        
        if (this.selectedPhotos.size === this.photos.length && this.photos.length > 0) {
            selectAllBtn.textContent = 'Deselect All';
        } else {
            selectAllBtn.textContent = 'Select All';
        }
    }
    
    async deleteSelectedPhotos() {
        if (this.selectedPhotos.size === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${this.selectedPhotos.size} selected photos? This cannot be undone.`)) {
            return;
        }
        
        try {
            this.showLoading();
            const photoIds = Array.from(this.selectedPhotos);
            
            for (const photoId of photoIds) {
                await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
            }
            
            this.selectedPhotos.clear();
            this.showNotification(`${photoIds.length} photos deleted successfully!`, 'success');
            
            // Reload collection
            await this.viewCollection(this.currentCollectionId);
        } catch (error) {
            console.error('Error deleting photos:', error);
            this.showNotification('Failed to delete photos', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    toggleMassDelete() {
        this.massDeleteMode = !this.massDeleteMode;
        const massDeleteBtn = document.getElementById('massDeleteBtn');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        
        if (this.massDeleteMode) {
            massDeleteBtn.textContent = '✓ Exit Mass Delete';
            massDeleteBtn.classList.add('active');
            selectAllBtn.classList.remove('hidden');
            deleteSelectedBtn.classList.remove('hidden');
        } else {
            massDeleteBtn.textContent = '🗑️ Mass Delete';
            massDeleteBtn.classList.remove('active');
            selectAllBtn.classList.add('hidden');
            deleteSelectedBtn.classList.add('hidden');
            this.selectedPhotos.clear();
        }
        
        // Re-render photos to show/hide selection checkboxes
        if (this.currentView === 'collection') {
            this.renderCollectionPhotos();
        }
    }
    
    // Photo Modal
    viewPhoto(imageUrl, title, photoId = null) {
        const modal = document.getElementById('photoModal');
        const modalImg = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        const downloadBtn = document.getElementById('downloadBtn');
        
        modalImg.src = imageUrl;
        modalTitle.textContent = title;
        this.currentPhotoId = photoId;
        
        // Setup download
        downloadBtn.onclick = () => this.downloadPhoto(imageUrl);
        
        // Show admin actions if logged in
        if (this.isLoggedIn && photoId) {
            this.setupPhotoActions(photoId);
        }
        
        modal.classList.add('active');
    }
    
    async downloadPhoto(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `photo_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            this.showNotification('Photo downloaded successfully!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Failed to download photo', 'error');
        }
    }
    
    setupPhotoActions(photoId) {
        const moveSelect = document.getElementById('moveToCollectionSelect');
        const removeBtn = document.getElementById('removeFromCollectionBtn');
        const deleteBtn = document.getElementById('deletePhotoBtn');
        
        // Setup move to collection
        moveSelect.onchange = () => {
            if (moveSelect.value) {
                this.movePhotoToCollection(photoId, moveSelect.value);
            }
        };
        
        // Setup remove from collection
        removeBtn.onclick = () => this.removePhotoFromCollection(photoId);
        
        // Setup delete photo
        deleteBtn.onclick = () => this.deletePhoto(photoId);
    }
    
    async movePhotoToCollection(photoId, newCollectionId) {
        try {
            const response = await fetch(`/api/photos/${photoId}/move`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection_id: newCollectionId })
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification('Photo moved successfully!', 'success');
                this.closeModal();
                await this.viewCollection(this.currentCollectionId);
            } else {
                this.showNotification(data.message || 'Failed to move photo', 'error');
            }
        } catch (error) {
            console.error('Error moving photo:', error);
            this.showNotification('Failed to move photo', 'error');
        }
    }
    
    async removePhotoFromCollection(photoId) {
        if (!confirm('Remove this photo from the collection?')) return;
        
        try {
            const response = await fetch(`/api/photos/${photoId}/remove`, {
                method: 'PUT'
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification('Photo removed from collection!', 'success');
                this.closeModal();
                await this.viewCollection(this.currentCollectionId);
            } else {
                this.showNotification(data.message || 'Failed to remove photo', 'error');
            }
        } catch (error) {
            console.error('Error removing photo:', error);
            this.showNotification('Failed to remove photo', 'error');
        }
    }
    
    async deletePhoto(photoId) {
        if (!confirm('Are you sure you want to permanently delete this photo?')) return;
        
        try {
            const response = await fetch(`/api/photos/${photoId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification('Photo deleted successfully!', 'success');
                this.closeModal();
                await this.viewCollection(this.currentCollectionId);
            } else {
                this.showNotification(data.message || 'Failed to delete photo', 'error');
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification('Failed to delete photo', 'error');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('photoModal');
        modal.classList.remove('active');
        this.currentPhotoId = null;
    }
    
    // Photo Upload
    async uploadPhotos() {
        const fileInput = document.getElementById('fileInput');
        const collectionSelect = document.getElementById('collectionSelect');
        const files = fileInput.files;
        
        if (files.length === 0) {
            this.showNotification('Please select files to upload', 'error');
            return;
        }
        
        const collectionId = collectionSelect.value || null;
        
        try {
            this.showLoading();
            let successCount = 0;
            
            for (const file of files) {
                const formData = new FormData();
                formData.append('photo', file);
                if (collectionId) {
                    formData.append('collection_id', collectionId);
                }
                
                const response = await fetch('/api/photos/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    successCount++;
                }
            }
            
            if (successCount > 0) {
                this.showNotification(`${successCount} photos uploaded successfully!`, 'success');
                fileInput.value = '';
                await this.loadCollections();
                
                // If we're in a collection view, reload it
                if (this.currentView === 'collection' && this.currentCollectionId) {
                    await this.viewCollection(this.currentCollectionId);
                }
            } else {
                this.showNotification('Failed to upload photos', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Failed to upload photos', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // Navigation
    showGallery() {
        // Hide collection view
        document.getElementById('collectionSection').classList.add('hidden');
        
        // Show gallery view
        document.getElementById('gallerySection').classList.remove('hidden');
        
        // Update navigation
        document.getElementById('galleryBtn').classList.add('active');
        document.getElementById('adminBtn').classList.remove('active');
        
        // Hide admin panel
        document.getElementById('adminPanel').classList.add('hidden');
        
        this.currentView = 'gallery';
        this.currentCollectionId = null;
        this.selectedPhotos.clear();
    }
    
    toggleAdmin() {
        const adminPanel = document.getElementById('adminPanel');
        const galleryBtn = document.getElementById('galleryBtn');
        const adminBtn = document.getElementById('adminBtn');
        
        if (adminPanel.classList.contains('hidden')) {
            // Show admin panel
            adminPanel.classList.remove('hidden');
            adminBtn.classList.add('active');
            galleryBtn.classList.remove('active');
            
            // Hide collection view if showing
            document.getElementById('collectionSection').classList.add('hidden');
            document.getElementById('gallerySection').classList.remove('hidden');
            
            this.currentView = 'admin';
        } else {
            // Hide admin panel
            adminPanel.classList.add('hidden');
            adminBtn.classList.remove('active');
            galleryBtn.classList.add('active');
            
            this.currentView = 'gallery';
        }
    }
    
    // Utility Functions
    updateCollectionOptions() {
        const selects = [
            document.getElementById('collectionSelect'),
            document.getElementById('moveToCollectionSelect')
        ];
        
        selects.forEach(select => {
            if (!select) return;
            
            const isUploadSelect = select.id === 'collectionSelect';
            select.innerHTML = isUploadSelect ? 
                '<option value="">Select Collection</option>' : 
                '<option value="">Move to Collection...</option>';
            
            this.collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.id;
                option.textContent = collection.name;
                select.appendChild(option);
            });
        });
    }
    
    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        
        if (fileInput && uploadArea) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                fileInput.files = e.dataTransfer.files;
            });
        }
        
        // Modal close
        const modal = document.getElementById('photoModal');
        const modalClose = document.querySelector('.modal-close');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // Enter key for login
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.login();
                }
            });
        }
        
        // Enter key for collection creation
        const collectionInput = document.getElementById('collectionNameInput');
        if (collectionInput) {
            collectionInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.createCollection();
                }
            });
        }
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: type === 'success' ? 'var(--apple-green)' : 
                       type === 'error' ? 'var(--apple-red)' : 'var(--apple-blue)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: '10001',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '300px',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application
let photoGallery;

document.addEventListener('DOMContentLoaded', () => {
    photoGallery = new PhotoGallery();
});

