class PhotoGallery {
    constructor() {
        this.currentCollection = null;
        this.collections = [];
        this.photos = [];
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadCollections();
    }

    bindEvents() {
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            this.showGalleryView();
        });

        // Modal close events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async loadCollections() {
        try {
            const response = await fetch('/api/collections');
            const data = await response.json();
            
            if (data.success) {
                this.collections = data.collections;
                this.renderCollections();
            } else {
                console.error('Failed to load collections:', data.message);
                this.showEmptyState('collectionsGrid', 'No Collections Found', 'Create some folders in the collections directory to get started.');
            }
        } catch (error) {
            console.error('Error loading collections:', error);
            this.showEmptyState('collectionsGrid', 'Error Loading Collections', 'Please check your connection and try again.');
        }
    }

    renderCollections() {
        const grid = document.getElementById('collectionsGrid');
        
        if (this.collections.length === 0) {
            this.showEmptyState('collectionsGrid', 'No Collections Found', 'Create some folders in the collections directory to get started.');
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
            this.showEmptyState('photosGrid', 'No Photos Found', 'This collection is empty. Add some photos to the folder to see them here.');
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
        document.getElementById('gallerySection').classList.remove('hidden');
        document.getElementById('collectionSection').classList.add('hidden');
        this.currentCollection = null;
    }

    showCollectionView(collectionName) {
        document.getElementById('gallerySection').classList.add('hidden');
        document.getElementById('collectionSection').classList.remove('hidden');
        document.getElementById('collectionTitle').textContent = collectionName;
    }

    openPhotoModal(photoUrl, filename, collection) {
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        const downloadBtn = document.getElementById('downloadBtn');
        
        modalImage.src = photoUrl;
        modalImage.alt = filename;
        
        // Set up download button
        downloadBtn.onclick = () => {
            this.downloadPhoto(collection, filename);
        };
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('photoModal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
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
            alert('Failed to download photo. Please try again.');
        }
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

