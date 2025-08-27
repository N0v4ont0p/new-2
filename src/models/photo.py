from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import cloudinary
import cloudinary.api
import cloudinary.uploader
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

db = SQLAlchemy()

class Photo(db.Model):
    __tablename__ = 'photos'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    cloudinary_public_id = db.Column(db.String(255), nullable=False, unique=True)
    cloudinary_url = db.Column(db.String(500), nullable=False)
    cloudinary_secure_url = db.Column(db.String(500), nullable=False)
    cloudinary_folder = db.Column(db.String(255))  # Collection folder name
    original_filename = db.Column(db.String(255))
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
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class CloudinaryCollectionManager:
    """Manages collections using Cloudinary folders"""
    
    @staticmethod
    def sync_photos_from_cloudinary():
        """Sync all photos from Cloudinary to database on startup"""
        try:
            print("Syncing photos from Cloudinary...")
            
            # Get all resources from Cloudinary
            result = cloudinary.api.resources(
                type='upload',
                max_results=500,  # Adjust as needed
                resource_type='image'
            )
            
            synced_count = 0
            
            for resource in result.get('resources', []):
                public_id = resource['public_id']
                
                # Skip placeholder files
                if '.placeholder' in public_id:
                    continue
                
                # Check if photo already exists in database
                existing_photo = Photo.query.filter_by(cloudinary_public_id=public_id).first()
                
                if not existing_photo:
                    # Extract folder name (collection)
                    folder_name = None
                    if '/' in public_id:
                        folder_name = public_id.split('/')[0]
                    
                    # Create title from public_id
                    title = public_id.split('/')[-1] if '/' in public_id else public_id
                    title = title.replace('_', ' ').title()
                    
                    # Create new photo record
                    photo = Photo(
                        title=title,
                        description='',
                        cloudinary_public_id=public_id,
                        cloudinary_url=resource['url'],
                        cloudinary_secure_url=resource['secure_url'],
                        cloudinary_folder=folder_name,
                        original_filename=resource.get('original_filename', title),
                        file_format=resource.get('format', 'jpg'),
                        file_size=resource.get('bytes', 0),
                        width=resource.get('width', 0),
                        height=resource.get('height', 0),
                        uploaded_at=datetime.utcnow()
                    )
                    
                    db.session.add(photo)
                    synced_count += 1
            
            if synced_count > 0:
                db.session.commit()
                print(f"Synced {synced_count} photos from Cloudinary")
            else:
                print("No new photos to sync")
                
        except Exception as e:
            print(f"Error syncing photos from Cloudinary: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def get_all_collections():
        """Get all collections from Cloudinary folders"""
        try:
            # Get all folders from Cloudinary
            result = cloudinary.api.root_folders()
            collections = []
            
            for folder in result.get('folders', []):
                folder_name = folder['name']
                
                # Skip system folders
                if folder_name.startswith('.') or folder_name in ['uncategorized']:
                    continue
                
                # Get photo count for this folder
                try:
                    folder_result = cloudinary.api.resources(
                        type='upload',
                        prefix=f"{folder_name}/",
                        max_results=1
                    )
                    photo_count = folder_result.get('total_count', 0)
                except:
                    photo_count = 0
                
                collections.append({
                    'id': folder_name,
                    'name': folder_name.replace('_', ' ').title(),
                    'photo_count': photo_count,
                    'created_at': datetime.utcnow().isoformat()
                })
            
            return collections
            
        except Exception as e:
            print(f"Error getting collections: {str(e)}")
            return []
    
    @staticmethod
    def create_collection(name):
        """Create a new collection (Cloudinary folder)"""
        try:
            # Sanitize folder name
            folder_name = name.lower().replace(' ', '_').replace('-', '_')
            folder_name = ''.join(c for c in folder_name if c.isalnum() or c == '_')
            
            if not folder_name:
                raise ValueError("Invalid collection name")
            
            # Create a placeholder file in the folder to ensure it exists
            placeholder_result = cloudinary.uploader.upload(
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA6VP0NQAAAABJRU5ErkJggg==",
                folder=folder_name,
                public_id=f"{folder_name}/.placeholder",
                resource_type="image"
            )
            
            return {
                'id': folder_name,
                'name': name,
                'photo_count': 0,
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error creating collection: {str(e)}")
            raise e
    
    @staticmethod
    def delete_collection(collection_id):
        """Delete a collection and all its photos"""
        try:
            # Delete all resources in the folder
            cloudinary.api.delete_resources_by_prefix(f"{collection_id}/")
            
            # Delete the folder itself
            try:
                cloudinary.api.delete_folder(collection_id)
            except:
                pass  # Folder might already be deleted
            
            # Delete photos from database
            photos = Photo.query.filter_by(cloudinary_folder=collection_id).all()
            for photo in photos:
                db.session.delete(photo)
            
            db.session.commit()
            return True
            
        except Exception as e:
            print(f"Error deleting collection: {str(e)}")
            db.session.rollback()
            raise e
    
    @staticmethod
    def get_collection_photos(collection_id):
        """Get all photos in a collection"""
        try:
            photos = Photo.query.filter_by(cloudinary_folder=collection_id).order_by(Photo.uploaded_at.desc()).all()
            return [photo.to_dict() for photo in photos]
            
        except Exception as e:
            print(f"Error getting collection photos: {str(e)}")
            return []
    
    @staticmethod
    def get_collection_by_id(collection_id):
        """Get collection info by ID"""
        try:
            collections = CloudinaryCollectionManager.get_all_collections()
            for collection in collections:
                if collection['id'] == collection_id:
                    return collection
            return None
            
        except Exception as e:
            print(f"Error getting collection: {str(e)}")
            return None

