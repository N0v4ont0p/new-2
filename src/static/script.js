class PhotoGallery {
    constructor() {
        this.currentCollection = null;
        this.collections = [];
        this.photos = [];
        this.isAdmin = false;
        this.currentView = 'gallery'; // gallery, collection, admin, login
        this.init();
    }

    async init() {
        this.bindEvents();
        this.checkAdminStatus();
        await this.loadCollections();
    }

    bindEvents() {
        // Navigation events
        document.getElementById('backBtn').addEventListener('click', () => {
            this.showGalleryView();
        });

        document.getElementById('adminLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminView();
        });

        document.getElementById('logoutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Admin events
        document.getElementById('backToGalleryBtn').addEventListener('click', () => {
            this.showGalleryView();
        });

        document.getElementById('createCollectionBtn').addEventListener('click', () => {
            this.showCreateCollectionModal();
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Create collection form
        document.getElementById('createCollectionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateCollection();
        });

        // Upload events
        this.setupUploadEvents();

        // Modal close events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeCreateCollectionModal();
            }
        });

        // Check for admin route
        if (window.location.hash === '#admin') {
            this.showLoginView();
        }
    }

    setupUploadEvents() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFileUpload(e.dataTransfer.files);
        });
    }

    checkAdminStatus() {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken === 'authenticated') {
            this.isAdmin = true;
            this.showAdminLinks();
        }
    }

    showAdminLinks() {
        document.getElementById('adminLink').classList.remove('hidden');
        document.getElementById('logoutLink').classList.remove('hidden');
    }

    hideAdminLinks() {
        document.getElementById('adminLink').classList.add('hidden');
        document.getElementById('logoutLink').classList.add('hidden');
    }

    async handleLogin() {
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success) {
                this.isAdmin = true;
                localStorage.setItem('adminToken', 'authenticated');
                this.showAdminLinks();
                this.showAdminView();
                errorDiv.classList.add('hidden');
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

    logout() {
        this.isAdmin = false;
        localStorage.removeItem('adminToken');
        this.hideAdminLinks();
        this.showGalleryView();
    }

    async loadCollections() {
        try {
            const response = await fetch('/api/collections');
            const data = await response.json();
            
            if (data.success) {
                this.collections = data.collections;
                this.renderCollections();
                if (this.isAdmin) {
                    this.renderAdminCollections();
                    this.updateCollectionSelect();
                }
            } else {
                console.error('Failed to load collections:', data.message);
                this.showEmptyState('collectionsGrid', 'No Collections Found', 'Create some collections to get started.');
            }
        } catch (error) {
            console.error('Error loading collections:', error);
            this.showEmptyState('collectionsGrid', 'Error Loading Collections', 'Please check your connection and try again.');
        }
    }

    renderCollections() {
        const grid = document.getElementById('collectionsGrid');
        
        if (this.collections.length === 0) {
            this.showEmptyState('collectionsGrid', 'No Collections Found', 'Create some collections to get started.');
            return;
        }

        grid.innerHTML = this.collections.map(collection => `
            <div class="collection-card" onclick="gallery.openCollection('${collection.name}')">
                <div class="collection-preview">
                    ${collection.preview_url ? 
                        `<img src="${collection.preview_url}" alt="${collection.name}" loading="lazy">` :
                        `<div class="collection-placeholder">📁</div>`
                    }
                </div>
                <div class="collection-info">
                    <h3 class="collection-name">${collection.name}</h3>
                    <p class="collection-count">${collection.photo_count} photo${collection.photo_count !== 1 ? 's' : ''}</p>
                </div>
            </div>
        `).join('');
    }

    renderAdminCollections() {
        const grid = document.getElementById('adminCollectionsGrid');
        
        if (this.collections.length === 0) {
            this.showEmptyState('adminCollectionsGrid', 'No Collections Found', 'Create your first collection to get started.');
            return;
        }

        grid.innerHTML = this.collections.map(collection => `
            <div class="collection-card">
                <div class="collection-preview">
                    ${collection.preview_url ? 
                        `<img src="${collection.preview_url}" alt="${collection.name}" loading="lazy">` :
                        `<div class="collection-placeholder">📁</div>`
                    }
                </div>
                <div class="collection-info">
                    <h3 class="collection-name">${collection.name}</h3>
                    <p class="collection-count">${collection.photo_count} photo${collection.photo_count !== 1 ? 's' : ''}</p>
                    <div style="margin-top: 12px; display: flex; gap: 8px;">
                        <button class="btn btn-secondary" onclick="gallery.openCollection('${collection.name}')">View</button>
                        <button class="btn btn-danger" onclick="gallery.deleteCollection('${collection.name}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateCollectionSelect() {
        const select = document.getElementById('collectionSelect');
        select.innerHTML = '<option value="">Choose a collection...</option>' +
            this.collections.map(collection => 
                `<option value="${collection.name}">${collection.name}</option>`
            ).join('');
    }

    async openCollection(collectionName) {
        this.currentCollection = collectionName;
        
        try {
            const response = await fetch(`/api/collections/${encodeURIComponent(collectionName)}/photos`);
            const data = await response.json();
            
            if (data.success) {
                this.photos = data.photos;
                this.showCollectionView(collectionName);
                this.renderPhotos();
            } else {
                console.error('Failed to load photos:', data.message);
                this.showEmptyState('photosGrid', 'Error Loading Photos', 'Failed to load photos from this collection.');
            }
        } catch (error) {
            console.error('Error loading photos:', error);
            this.showEmptyState('photosGrid', 'Error Loading Photos', 'Please check your connection and try again.');
        }
    }

    renderPhotos() {
        const grid = document.getElementById('photosGrid');
        
        if (this.photos.length === 0) {
            this.showEmptyState('photosGrid', 'No Photos Found', 'This collection is empty. Add some photos to see them here.');
            return;
        }

        grid.innerHTML = this.photos.map(photo => `
            <div class="photo-item" onclick="gallery.openPhotoModal('${photo.url}', '${photo.filename}', '${photo.collection}')">
                <img src="${photo.url}" alt="${photo.filename}" loading="lazy">
                <div class="photo-info">
                    <p class="photo-name">${photo.filename}</p>
                </div>
            </div>
        `).join('');
    }

    showGalleryView() {
        this.hideAllSections();
        document.getElementById('gallerySection').classList.remove('hidden');
        this.currentView = 'gallery';
        this.currentCollection = null;
        window.location.hash = '';
    }

    showCollectionView(collectionName) {
        this.hideAllSections();
        document.getElementById('collectionSection').classList.remove('hidden');
        document.getElementById('collectionTitle').textContent = collectionName;
        this.currentView = 'collection';
    }

    showLoginView() {
        this.hideAllSections();
        document.getElementById('loginSection').classList.remove('hidden');
        this.currentView = 'login';
        window.location.hash = '#admin';
    }

    showAdminView() {
        if (!this.isAdmin) {
            this.showLoginView();
            return;
        }
        
        this.hideAllSections();
        document.getElementById('adminSection').classList.remove('hidden');
        this.currentView = 'admin';
        this.loadCollections(); // Refresh collections for admin view
        window.location.hash = '#admin';
    }

    hideAllSections() {
        document.querySelectorAll('.main-section').forEach(section => {
            section.classList.add('hidden');
        });
    }

    openPhotoModal(photoUrl, filename, collection) {
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        const downloadBtn = document.getElementById('downloadBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        
        modalImage.src = photoUrl;
        modalImage.alt = filename;
        
        // Set up download button
        downloadBtn.onclick = () => {
            this.downloadPhoto(collection, filename);
        };
        
        // Show delete button only for admin
        if (this.isAdmin) {
            deleteBtn.classList.remove('hidden');
            deleteBtn.onclick = () => {
                this.deletePhoto(collection, filename);
            };
        } else {
            deleteBtn.classList.add('hidden');
        }
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('photoModal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    showCreateCollectionModal() {
        const modal = document.getElementById('createCollectionModal');
        modal.classList.remove('hidden');
        document.getElementById('collectionName').value = '';
        document.body.style.overflow = 'hidden';
    }

    closeCreateCollectionModal() {
        const modal = document.getElementById('createCollectionModal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    async handleCreateCollection() {
        const name = document.getElementById('collectionName').value.trim();
        
        if (!name) {
            this.showAlert('Please enter a collection name', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message, 'success');
                this.closeCreateCollectionModal();
                await this.loadCollections();
            } else {
                this.showAlert(data.message, 'error');
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            this.showAlert('Failed to create collection', 'error');
        }
    }

    async deleteCollection(collectionName) {
        if (!confirm(`Are you sure you want to delete the collection "${collectionName}" and all its photos?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/collections/${encodeURIComponent(collectionName)}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message, 'success');
                await this.loadCollections();
            } else {
                this.showAlert(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            this.showAlert('Failed to delete collection', 'error');
        }
    }

    async deletePhoto(collection, filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/photos/${encodeURIComponent(collection)}/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message, 'success');
                this.closeModal();
                // Refresh current view
                if (this.currentCollection) {
                    await this.openCollection(this.currentCollection);
                }
                await this.loadCollections();
            } else {
                this.showAlert(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showAlert('Failed to delete photo', 'error');
        }
    }

    async handleFileUpload(files) {
        const collectionSelect = document.getElementById('collectionSelect');
        const selectedCollection = collectionSelect.value;

        if (!selectedCollection) {
            this.showAlert('Please select a collection first', 'error');
            return;
        }

        if (files.length === 0) {
            return;
        }

        const formData = new FormData();
        formData.append('collection', selectedCollection);

        for (let file of files) {
            formData.append('files', file);
        }

        try {
            document.getElementById('uploadProgress').classList.remove('hidden');
            
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message, 'success');
                if (data.errors && data.errors.length > 0) {
                    data.errors.forEach(error => {
                        this.showAlert(error, 'error');
                    });
                }
                await this.loadCollections();
            } else {
                this.showAlert(data.message, 'error');
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            this.showAlert('Failed to upload files', 'error');
        } finally {
            document.getElementById('uploadProgress').classList.add('hidden');
            document.getElementById('fileInput').value = '';
        }
    }

    async downloadPhoto(collection, filename) {
        try {
            const downloadUrl = `/api/photo/${encodeURIComponent(collection)}/${encodeURIComponent(filename)}/download`;
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading photo:', error);
            this.showAlert('Failed to download photo', 'error');
        }
    }

    showAlert(message, type = 'success') {
        const container = document.getElementById('alertsContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.marginBottom = '12px';
        alert.style.minWidth = '300px';
        
        container.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    showEmptyState(containerId, title, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="empty-state">
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the gallery when the page loads
const gallery = new PhotoGallery();

