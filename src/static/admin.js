class AdminPanel {
    constructor() {
        this.isLoggedIn = false;
        this.collections = [];
        this.photos = [];
        this.selectedPhotos = new Set();
        this.massDeleteMode = false;
        this.currentPhotoId = null;
        
        this.init();
    }
    
    async init() {
        await this.checkAuthStatus();
        this.setupEventListeners();
        
        if (this.isLoggedIn) {
            await this.loadCollections();
            await this.loadPhotos();
        }
    }
    
    setupEventListeners() {
        // File input change
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });
        
        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
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
            this.handleFileSelect(e.dataTransfer.files);
        });
        
        // Collection selection change
        document.getElementById('viewCollection').addEventListener('change', (e) => {
            this.filterPhotosByCollection(e.target.value);
        });
        
        // Enter key for password
        document.getElementById('adminPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.login();
            }
        });
        
        // Enter key for collection name
        document.getElementById('collectionName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createCollection();
            }
        });
    }
    
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            this.isLoggedIn = data.authenticated;
            this.updateUI();
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.isLoggedIn = false;
            this.updateUI();
        }
    }
    
    async login() {
        const password = document.getElementById('adminPassword').value;
        
        if (!password) {
            this.showNotification('Please enter a password', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.isLoggedIn = true;
                this.showNotification('Login successful!', 'success');
                this.updateUI();
                await this.loadCollections();
                await this.loadPhotos();
            } else {
                this.showNotification('Invalid password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed', 'error');
        }
    }
    
    updateUI() {
        const loginSection = document.getElementById('loginSection');
        const adminDashboard = document.getElementById('adminDashboard');
        
        if (this.isLoggedIn) {
            loginSection.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
        } else {
            loginSection.classList.remove('hidden');
            adminDashboard.classList.add('hidden');
        }
    }
    
    async loadCollections() {
        try {
            const response = await fetch('/api/collections');
            const data = await response.json();
            this.collections = data.collections || [];
            this.renderCollections();
            this.updateCollectionSelects();
        } catch (error) {
            console.error('Error loading collections:', error);
            this.showNotification('Failed to load collections', 'error');
        }
    }
    
    renderCollections() {
        const grid = document.getElementById('collectionsGrid');
        
        if (this.collections.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--apple-gray-500);">No collections yet. Create your first collection above.</p>';
            return;
        }
        
        const collectionsHTML = this.collections.map(collection => `
            <div class="collection-card">
                <div class="collection-name">${collection.name}</div>
                <div class="collection-actions">
                    <button onclick="adminPanel.viewCollectionPhotos('${collection.id}')" class="btn-secondary">View Photos</button>
                    <button onclick="adminPanel.deleteCollection('${collection.id}')" class="btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
        
        grid.innerHTML = collectionsHTML;
    }
    
    updateCollectionSelects() {
        const selects = ['uploadCollection', 'viewCollection', 'moveToCollection'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            const currentValue = select.value;
            
            // Clear existing options except the first one
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Add collection options
            this.collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.id;
                option.textContent = collection.name;
                select.appendChild(option);
            });
            
            // Restore selection if it still exists
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }
    
    async createCollection() {
        const name = document.getElementById('collectionName').value.trim();
        
        if (!name) {
            this.showNotification('Please enter a collection name', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Collection created successfully!', 'success');
                document.getElementById('collectionName').value = '';
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
        if (!confirm('Are you sure you want to delete this collection? This will also delete all photos in it.')) {
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
                await this.loadPhotos();
            } else {
                this.showNotification(data.message || 'Failed to delete collection', 'error');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            this.showNotification('Failed to delete collection', 'error');
        }
    }
    
    async loadPhotos() {
        try {
            const response = await fetch('/api/photos');
            const data = await response.json();
            this.photos = data.photos || [];
            this.renderPhotos();
        } catch (error) {
            console.error('Error loading photos:', error);
            this.showNotification('Failed to load photos', 'error');
        }
    }
    
    renderPhotos() {
        const grid = document.getElementById('photosGrid');
        const selectedCollection = document.getElementById('viewCollection').value;
        
        let photosToShow = this.photos;
        if (selectedCollection) {
            photosToShow = this.photos.filter(photo => photo.collection_id == selectedCollection);
        }
        
        if (photosToShow.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--apple-gray-500);">No photos found.</p>';
            return;
        }
        
        const photosHTML = photosToShow.map(photo => `
            <div class="photo-item" onclick="adminPanel.viewPhoto('${photo.cloudinary_secure_url}', '${photo.filename || 'Photo'}', ${photo.id})">
                <img src="${photo.cloudinary_secure_url}" alt="Photo" loading="lazy">
                ${this.massDeleteMode ? `
                    <div class="photo-checkbox ${this.selectedPhotos.has(photo.id) ? 'checked' : ''}" 
                         onclick="event.stopPropagation(); adminPanel.togglePhotoSelection(${photo.id})">
                        ${this.selectedPhotos.has(photo.id) ? '✓' : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        grid.innerHTML = photosHTML;
    }
    
    filterPhotosByCollection(collectionId) {
        this.renderPhotos();
    }
    
    viewCollectionPhotos(collectionId) {
        document.getElementById('viewCollection').value = collectionId;
        this.renderPhotos();
    }
    
    async handleFileSelect(files) {
        const collectionId = document.getElementById('uploadCollection').value;
        
        if (!collectionId) {
            this.showNotification('Please select a collection first', 'error');
            return;
        }
        
        if (files.length === 0) return;
        
        this.showNotification(`Uploading ${files.length} photo(s)...`, 'success');
        
        for (const file of files) {
            await this.uploadPhoto(file, collectionId);
        }
        
        await this.loadPhotos();
    }
    
    async uploadPhoto(file, collectionId) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('collection_id', collectionId);
        
        try {
            const response = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (!data.success) {
                this.showNotification(`Failed to upload ${file.name}: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification(`Failed to upload ${file.name}`, 'error');
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
        
        this.renderPhotos();
        this.updateDeleteSelectedButton();
    }
    
    togglePhotoSelection(photoId) {
        if (this.selectedPhotos.has(photoId)) {
            this.selectedPhotos.delete(photoId);
        } else {
            this.selectedPhotos.add(photoId);
        }
        this.renderPhotos();
        this.updateDeleteSelectedButton();
    }
    
    selectAllPhotos() {
        const selectedCollection = document.getElementById('viewCollection').value;
        let photosToShow = this.photos;
        if (selectedCollection) {
            photosToShow = this.photos.filter(photo => photo.collection_id == selectedCollection);
        }
        
        if (this.selectedPhotos.size === photosToShow.length) {
            // Deselect all
            this.selectedPhotos.clear();
        } else {
            // Select all
            photosToShow.forEach(photo => this.selectedPhotos.add(photo.id));
        }
        this.renderPhotos();
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
        
        const selectedCollection = document.getElementById('viewCollection').value;
        let photosToShow = this.photos;
        if (selectedCollection) {
            photosToShow = this.photos.filter(photo => photo.collection_id == selectedCollection);
        }
        
        if (this.selectedPhotos.size === photosToShow.length && photosToShow.length > 0) {
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
            const photoIds = Array.from(this.selectedPhotos);
            
            for (const photoId of photoIds) {
                await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
            }
            
            this.selectedPhotos.clear();
            this.showNotification(`${photoIds.length} photos deleted successfully!`, 'success');
            
            await this.loadPhotos();
        } catch (error) {
            console.error('Error deleting photos:', error);
            this.showNotification('Failed to delete photos', 'error');
        }
    }
    
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
        
        modal.classList.remove('hidden');
    }
    
    closeModal() {
        document.getElementById('photoModal').classList.add('hidden');
        this.currentPhotoId = null;
    }
    
    downloadPhoto(imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'photo.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    async movePhoto() {
        const newCollectionId = document.getElementById('moveToCollection').value;
        
        if (!newCollectionId || !this.currentPhotoId) {
            this.showNotification('Please select a collection', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/photos/${this.currentPhotoId}/move`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ collection_id: newCollectionId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Photo moved successfully!', 'success');
                this.closeModal();
                await this.loadPhotos();
            } else {
                this.showNotification(data.message || 'Failed to move photo', 'error');
            }
        } catch (error) {
            console.error('Error moving photo:', error);
            this.showNotification('Failed to move photo', 'error');
        }
    }
    
    async deletePhoto() {
        if (!this.currentPhotoId) return;
        
        if (!confirm('Are you sure you want to delete this photo? This cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/photos/${this.currentPhotoId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Photo deleted successfully!', 'success');
                this.closeModal();
                await this.loadPhotos();
            } else {
                this.showNotification(data.message || 'Failed to delete photo', 'error');
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification('Failed to delete photo', 'error');
        }
    }
    
    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();

