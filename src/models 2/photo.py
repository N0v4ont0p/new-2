from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import cloudinary
import cloudinary.api
import os
import re

db = SQLAlchemy()

class Photo(db.Model):
    __tablename__ = 'photos'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    cloudinary_public_id = db.Column(db.String(200), nullable=False, unique=True)
    cloudinary_url = db.Column(db.String(500), nullable=False)
    cloudinary_secure_url = db.Column(db.String(500), nullable=False)
    cloudinary_folder = db.Column(db.String(255))  # Store the Cloudinary folder name for permanent collections
    original_filename = db.Column(db.String(200))
    file_format = db.Column(db.String(10))
    file_size = db.Column(db.Integer)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'cloudinary_public_id': self.cloudinary_public_id,
            'cloudinary_url': self.cloudinary_url,
            'cloudinary_secure_url': self.cloudinary_secure_url,
            'cloudinary_folder': self.cloudinary_folder,
            'original_filename': self.original_filename,
            'file_format': self.file_format,
            'file_size': self.file_size,
            'width': self.width,
            'height': self.height,
            'uploaded_at': self.uploaded_at.isoformat(),
            'collection_name': self.get_collection_name()
        }
    
    def get_collection_name(self):
        """Get collection name from Cloudinary folder"""
        if self.cloudinary_folder:
            return self.cloudinary_folder.replace('photo_gallery_', '').replace('_', ' ').title()
        return None

class CloudinaryCollectionManager:
    """Manages collections using Cloudinary folders for PERMANENT storage"""
    
    @staticmethod
    def sanitize_collection_name(name):
        """Convert collection name to safe folder name"""
        # Remove special characters and convert to lowercase
        safe_name = re.sub(r'[^a-zA-Z0-9\s\-_]', '', name)
        safe_name = safe_name.strip().lower()
        safe_name = re.sub(r'\s+', '_', safe_name)  # Replace spaces with underscores
        safe_name = re.sub(r'[-_]+', '_', safe_name)  # Replace multiple dashes/underscores with single underscore
        return f"photo_gallery_{safe_name}"
    
    @staticmethod
    def get_all_collections():
        """Get all collections from Cloudinary folders - PERMANENT storage"""
        try:
            # Get all folders from Cloudinary
            result = cloudinary.api.root_folders()
            collections = []
            
            for folder in result.get('folders', []):
                folder_name = folder['name']
                if folder_name.startswith('photo_gallery_'):
                    collection_name = folder_name.replace('photo_gallery_', '').replace('_', ' ').title()
                    
                    # Get photo count for this folder from database
                    photo_count = Photo.query.filter_by(cloudinary_folder=folder_name).count()
                    
                    collections.append({
                        'id': folder_name,
                        'name': collection_name,
                        'folder_name': folder_name,
                        'photo_count': photo_count,
                        'created_at': datetime.utcnow().isoformat()
                    })
            
            # Sort by name
            collections.sort(key=lambda x: x['name'])
            return collections
            
        except Exception as e:
            print(f"Error getting collections from Cloudinary: {str(e)}")
            return []
    
    @staticmethod
    def create_collection(name):
        """Create a new collection by creating a Cloudinary folder - PERMANENT"""
        try:
            if not name or not name.strip():
                return None, "Collection name cannot be empty"
            
            # Sanitize collection name for folder
            folder_name = CloudinaryCollectionManager.sanitize_collection_name(name)
            
            # Check if folder already exists
            existing_collections = CloudinaryCollectionManager.get_all_collections()
            for collection in existing_collections:
                if collection['folder_name'] == folder_name:
                    return None, "Collection with this name already exists"
            
            # Create a temporary placeholder to ensure folder exists in Cloudinary
            placeholder_result = cloudinary.uploader.upload(
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                folder=folder_name,
                public_id="temp_placeholder",
                resource_type="image",
                overwrite=True
            )
            
            # Immediately delete the placeholder
            try:
                cloudinary.uploader.destroy(placeholder_result['public_id'])
            except:
                pass  # Don't fail if placeholder deletion fails
            
            return {
                'id': folder_name,
                'name': name.strip().title(),
                'folder_name': folder_name,
                'photo_count': 0,
                'created_at': datetime.utcnow().isoformat()
            }, None
            
        except Exception as e:
            print(f"Error creating collection: {str(e)}")
            return None, f"Failed to create collection: {str(e)}"
    
    @staticmethod
    def delete_collection(collection_id):
        """Delete a collection by removing all photos in the Cloudinary folder - PERMANENT deletion"""
        try:
            # Get all photos in this collection from database
            photos = Photo.query.filter_by(cloudinary_folder=collection_id).all()
            
            # Delete photos from Cloudinary and database
            for photo in photos:
                try:
                    # Delete from Cloudinary
                    cloudinary.uploader.destroy(photo.cloudinary_public_id)
                except Exception as e:
                    print(f"Error deleting photo from Cloudinary: {str(e)}")
                
                # Delete from database
                db.session.delete(photo)
            
            db.session.commit()
            
            # Try to delete the empty folder from Cloudinary
            try:
                cloudinary.api.delete_folder(collection_id)
            except:
                pass  # Folder might not be empty or might not exist
            
            return True, "Collection deleted successfully"
            
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting collection: {str(e)}")
            return False, f"Failed to delete collection: {str(e)}"
    
    @staticmethod
    def get_collection_photos(collection_id):
        """Get all photos in a specific collection - PERMANENT storage"""
        try:
            photos = Photo.query.filter_by(cloudinary_folder=collection_id).order_by(Photo.uploaded_at.desc()).all()
            return [photo.to_dict() for photo in photos]
        except Exception as e:
            print(f"Error getting collection photos: {str(e)}")
            return []
    
    @staticmethod
    def get_collection_by_id(collection_id):
        """Get collection info by ID"""
        collections = CloudinaryCollectionManager.get_all_collections()
        for collection in collections:
            if collection['id'] == collection_id:
                return collection
        return None

# Legacy Collection model - keeping for backward compatibility but will use Cloudinary folders
class Collection(db.Model):
    __tablename__ = 'collections'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'photo_count': 0  # Legacy support
        }

