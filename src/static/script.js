class PhotoGallery {
    constructor() {
        this.collections = [];
        this.photos = [];
        this.currentCollection = null;
        this.currentView = 'gallery';
        
        this.init();
    }
    
    async init() {
        await this.loadCollections();
        this.renderCollections();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Download button in modal
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadCurrentPhoto();
        });
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
    
    renderCollections() {
        const grid = document.getElementById('collectionsGrid');
        
        if (this.collections.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No Collections Yet</h3>
                    <p>Collections will appear here once they are created in the admin panel.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.collections.map(collection => `
            <div class="collection-card" onclick="gallery.viewCollection('${collection.name}')">
                <div class="collection-preview">
                    ${collection.preview_url ? 
                        `<img src="${collection.preview_url}" alt="${collection.name}">` :
                        `<div style="color: var(--apple-gray-400); font-size: 48px;">📁</div>`
                    }
                </div>
                <div class="collection-info">
                    <div class="collection-name">${collection.name}</div>
                    <div class="collection-count">${collection.photo_count} photos</div>
                </div>
            </div>
        `).join('');
    }
    
    async viewCollection(collectionName) {
        try {
            const response = await fetch(`/api/photos?collection=${encodeURIComponent(collectionName)}`);
            const data = await response.json();
            
            if (data.success) {
                this.photos = data.photos;
                this.currentCollection = collectionName;
                this.showCollectionView();
            }
        } catch (error) {
            console.error('Error loading collection photos:', error);
        }
    }
    
    showCollectionView() {
        document.getElementById('gallerySection').classList.add('hidden');
        document.getElementById('collectionSection').classList.remove('hidden');
        document.getElementById('collectionTitle').textContent = this.currentCollection;
        
        this.renderPhotos();
        this.currentView = 'collection';
    }
    
    showGallery() {
        document.getElementById('collectionSection').classList.add('hidden');
        document.getElementById('gallerySection').classList.remove('hidden');
        
        this.currentView = 'gallery';
        this.currentCollection = null;
    }
    
    renderPhotos() {
        const grid = document.getElementById('photosGrid');
        
        if (this.photos.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No Photos in This Collection</h3>
                    <p>Photos will appear here once they are uploaded to this collection.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.photos.map(photo => `
            <div class="photo-item" onclick="gallery.viewPhoto('${photo.cloudinary_secure_url}', '${photo.filename}')">
                <img src="${photo.cloudinary_secure_url}" alt="${photo.filename}" loading="lazy">
            </div>
        `).join('');
    }
    
    viewPhoto(url, filename) {
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        
        modalImage.src = url;
        modalImage.alt = filename;
        modal.classList.remove('hidden');
        
        // Store current photo for download
        this.currentPhotoUrl = url;
        this.currentPhotoFilename = filename;
    }
    
    closeModal() {
        document.getElementById('photoModal').classList.add('hidden');
        this.currentPhotoUrl = null;
        this.currentPhotoFilename = null;
    }
    
    async downloadCurrentPhoto() {
        if (!this.currentPhotoUrl) return;
        
        try {
            const response = await fetch(this.currentPhotoUrl);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.currentPhotoFilename || 'photo.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading photo:', error);
        }
    }
}

// Initialize gallery when page loads
const gallery = new PhotoGallery();

