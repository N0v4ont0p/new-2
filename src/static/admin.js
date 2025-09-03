class AdminPanel {
    constructor() {
        this.isAuthenticated = false;
        this.collections = [];
        this.photos = [];
        this.selectedPhotos = new Set();
        this.selectMode = false;
        this.currentPhoto = null;
        
        this.init();
    }
    
    async init() {
        await this.checkAuthStatus();
        this.setupEventListeners();
        
        if (this.isAuthenticated) {
            this.showAdminContent();
            await this.loadData();
        } else {
            this.showLoginSection();
        }
    }
    
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
        
        // File upload
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Collection management
        document.getElementById('createCollectionBtn').addEventListener('click', () => {
            this.showModal('createCollectionModal');
        });
        
        document.getElementById('createCollectionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCollection();
        });
        
        // Photo management
        document.getElementById('toggleSelectBtn').addEventListener('click', () => {
            this.toggleSelectMode();
        });
        
        document.getElementById('massDeleteBtn').addEventListener('click', () => {
            this.massDeletePhotos();
        });
        
        // Photo modal actions
        document.getElementById('downloadPhotoBtn').addEventListener('click', () => {
            this.downloadCurrentPhoto();
        });
        
        document.getElementById('movePhotoBtn').addEventListener('click', () => {
            this.showMovePhotoModal();
        });
        
        document.getElementById('deletePhotoBtn').addEventListener('click', () => {
            this.deleteCurrentPhoto();
        });
        
        document.getElementById('movePhotoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.movePhoto();
        });
    }
    
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            this.isAuthenticated = data.authenticated;
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.isAuthenticated = false;
        }
    }
    
    async login() {
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.isAuthenticated = true;
                this.showAdminContent();
                await this.loadData();
            } else {
                errorDiv.textContent = data.message;
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = 'Login failed. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }
    
    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.isAuthenticated = false;
            this.showLoginSection();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    showLoginSection() {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('adminContent').classList.add('hidden');
    }
    
    showAdminContent() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('adminContent').classList.remove('hidden');
    }
    
    async loadData() {
        await Promise.all([
            this.loadCollections(),
            this.loadPhotos()
        ]);
        
        this.renderCollections();
        this.renderPhotos();
        this.updateCollectionSelects();
    }
    
    async loadCollections() {
        try {
            const response = await fetch('/api/collections');
            const data = await response.json();
            
            if (data.success) {
                this.collections = data.collections;
            }
        } catch (error) {
            console.error('Error loading collections:', error);
        }
    }
    
    async loadPhotos() {
        try {
            const response = await fetch('/api/photos');
            const data = await response.json();
            
            if (data.success) {
                this.photos = data.photos;
            }
        } catch (error) {
            console.error('Error loading photos:', error);
        }
    }
    
    renderCollections() {
        const grid = document.getElementById('collectionsGrid');
        
        if (this.collections.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No Collections</h3>
                    <p>Create your first collection to get started.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.collections.map(collection => `
            <div class="admin-collection-card">
                <h3>${collection.name}</h3>
                <p>${collection.photo_count} photos</p>
                <div class="collection-actions">
                    <button class="btn btn-danger" onclick="admin.deleteCollection('${collection.name}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    renderPhotos() {
        const grid = document.getElementById('photosGrid');
        
        if (this.photos.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No Photos</h3>
                    <p>Upload your first photos to get started.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.photos.map(photo => `
            <div class="admin-photo-item" onclick="admin.viewPhoto(${photo.id}, '${photo.cloudinary_secure_url}', '${photo.filename}')">
                <img src="${photo.cloudinary_secure_url}" alt="${photo.filename}" loading="lazy">
                ${this.selectMode ? `
                    <div class="photo-checkbox ${this.selectedPhotos.has(photo.id) ? 'checked' : ''}" 
                         onclick="event.stopPropagation(); admin.togglePhotoSelection(${photo.id})">
                        ${this.selectedPhotos.has(photo.id) ? '✓' : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    updateCollectionSelects() {
        const selects = ['collectionSelect', 'moveToCollection'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            const currentValue = select.value;
            
            select.innerHTML = '<option value="">Select Collection</option>' +
                this.collections.map(collection => 
                    `<option value="${collection.name}">${collection.name}</option>`
                ).join('');
            
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }
    
    async createCollection() {
        const name = document.getElementById('collectionName').value.trim();
        
        if (!name) return;
        
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeModal('createCollectionModal');
                document.getElementById('collectionName').value = '';
                await this.loadCollections();
                this.renderCollections();
                this.updateCollectionSelects();
                this.showNotification('Collection created successfully', 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            this.showNotification('Failed to create collection', 'error');
        }
    }
    
    async deleteCollection(name) {
        if (!confirm(`Are you sure you want to delete the collection "${name}" and all its photos?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/collections/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                await this.loadData();
                this.showNotification('Collection deleted successfully', 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            this.showNotification('Failed to delete collection', 'error');
        }
    }
    
    async handleFiles(files) {
        const collectionName = document.getElementById('collectionSelect').value;
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressDiv.classList.remove('hidden');
        
        let uploaded = 0;
        const total = files.length;
        
        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('photo', file);
                if (collectionName) {
                    formData.append('collection_name', collectionName);
                }
                
                const response = await fetch('/api/photos/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    uploaded++;
                } else {
                    console.error('Upload failed:', data.message);
                }
            } catch (error) {
                console.error('Upload error:', error);
            }
            
            // Update progress
            const progress = (uploaded / total) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Uploaded ${uploaded}/${total} photos`;
        }
        
        // Hide progress and reload data
        setTimeout(() => {
            progressDiv.classList.add('hidden');
            progressFill.style.width = '0%';
        }, 1000);
        
        await this.loadData();
        this.showNotification(`Successfully uploaded ${uploaded} photos`, 'success');
    }
    
    toggleSelectMode() {
        this.selectMode = !this.selectMode;
        this.selectedPhotos.clear();
        
        const toggleBtn = document.getElementById('toggleSelectBtn');
        const massDeleteBtn = document.getElementById('massDeleteBtn');
        
        if (this.selectMode) {
            toggleBtn.textContent = 'Cancel Selection';
            massDeleteBtn.classList.remove('hidden');
        } else {
            toggleBtn.textContent = 'Select Photos';
            massDeleteBtn.classList.add('hidden');
        }
        
        this.renderPhotos();
    }
    
    togglePhotoSelection(photoId) {
        if (this.selectedPhotos.has(photoId)) {
            this.selectedPhotos.delete(photoId);
        } else {
            this.selectedPhotos.add(photoId);
        }
        
        this.renderPhotos();
    }
    
    async massDeletePhotos() {
        if (this.selectedPhotos.size === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${this.selectedPhotos.size} selected photos?`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/photos/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photo_ids: Array.from(this.selectedPhotos) })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.selectedPhotos.clear();
                this.toggleSelectMode();
                await this.loadData();
                this.showNotification(`Deleted ${data.deleted_count} photos`, 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting photos:', error);
            this.showNotification('Failed to delete photos', 'error');
        }
    }
    
    viewPhoto(id, url, filename) {
        if (this.selectMode) return;
        
        this.currentPhoto = { id, url, filename };
        
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        
        modalImage.src = url;
        modalImage.alt = filename;
        modal.classList.remove('hidden');
    }
    
    showMovePhotoModal() {
        this.closeModal('photoModal');
        this.showModal('movePhotoModal');
    }
    
    async movePhoto() {
        const newCollection = document.getElementById('moveToCollection').value;
        
        if (!this.currentPhoto) return;
        
        try {
            const response = await fetch(`/api/photos/${this.currentPhoto.id}/move`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection_name: newCollection || null })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeModal('movePhotoModal');
                await this.loadData();
                this.showNotification('Photo moved successfully', 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error moving photo:', error);
            this.showNotification('Failed to move photo', 'error');
        }
    }
    
    async deleteCurrentPhoto() {
        if (!this.currentPhoto) return;
        
        if (!confirm('Are you sure you want to delete this photo?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/photos/${this.currentPhoto.id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeModal('photoModal');
                await this.loadData();
                this.showNotification('Photo deleted successfully', 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification('Failed to delete photo', 'error');
        }
    }
    
    async downloadCurrentPhoto() {
        if (!this.currentPhoto) return;
        
        try {
            const response = await fetch(this.currentPhoto.url);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.currentPhoto.filename || 'photo.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading photo:', error);
            this.showNotification('Failed to download photo', 'error');
        }
    }
    
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'success' ? 'success-message' : 'error-message'}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '10001';
        notification.style.maxWidth = '300px';
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize admin panel when page loads
const admin = new AdminPanel();

