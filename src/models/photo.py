import os
import sqlite3
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

db = SQLAlchemy()

class Photo(db.Model):
    __tablename__ = 'photos'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    cloudinary_public_id = db.Column(db.String(255), unique=True, nullable=False)
    cloudinary_secure_url = db.Column(db.Text, nullable=False)
    collection_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'cloudinary_public_id': self.cloudinary_public_id,
            'cloudinary_secure_url': self.cloudinary_secure_url,
            'collection_name': self.collection_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def create(filename, cloudinary_public_id, cloudinary_secure_url, collection_name=None):
        """Create a new photo record"""
        photo = Photo(
            filename=filename,
            cloudinary_public_id=cloudinary_public_id,
            cloudinary_secure_url=cloudinary_secure_url,
            collection_name=collection_name
        )
        db.session.add(photo)
        db.session.commit()
        return photo
    
    @staticmethod
    def get_all():
        """Get all photos"""
        return Photo.query.order_by(Photo.created_at.desc()).all()
    
    @staticmethod
    def get_by_collection(collection_name):
        """Get photos by collection"""
        if collection_name:
            return Photo.query.filter_by(collection_name=collection_name).order_by(Photo.created_at.desc()).all()
        else:
            return Photo.query.filter_by(collection_name=None).order_by(Photo.created_at.desc()).all()
    
    @staticmethod
    def delete_by_id(photo_id):
        """Delete photo by ID"""
        photo = Photo.query.get(photo_id)
        if photo:
            # Delete from Cloudinary
            try:
                cloudinary.uploader.destroy(photo.cloudinary_public_id)
            except Exception as e:
                print(f"Error deleting from Cloudinary: {e}")
            
            # Delete from database
            db.session.delete(photo)
            db.session.commit()
            return True
        return False

class Collection(db.Model):
    __tablename__ = 'collections'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        photos = Photo.get_by_collection(self.name)
        preview_url = photos[0].cloudinary_secure_url if photos else None
        
        return {
            'id': self.name,
            'name': self.name,
            'photo_count': len(photos),
            'preview_url': preview_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def create(name):
        """Create a new collection"""
        # Check if collection already exists
        existing = Collection.query.filter_by(name=name).first()
        if existing:
            return existing
        
        collection = Collection(name=name)
        db.session.add(collection)
        db.session.commit()
        return collection
    
    @staticmethod
    def get_all():
        """Get all collections"""
        return Collection.query.order_by(Collection.created_at.desc()).all()
    
    @staticmethod
    def delete_by_name(name):
        """Delete collection and all its photos"""
        collection = Collection.query.filter_by(name=name).first()
        if collection:
            # Delete all photos in this collection
            photos = Photo.get_by_collection(name)
            for photo in photos:
                Photo.delete_by_id(photo.id)
            
            # Delete collection
            db.session.delete(collection)
            db.session.commit()
            return True
        return False

class CloudinaryManager:
    """Manager for Cloudinary operations"""
    
    @staticmethod
    def upload_photo(file, collection_name=None):
        """Upload photo to Cloudinary"""
        try:
            # Create folder path
            folder = f"photo_gallery/{collection_name}" if collection_name else "photo_gallery"
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                file,
                folder=folder,
                resource_type="auto"
            )
            
            return {
                'public_id': result['public_id'],
                'secure_url': result['secure_url'],
                'success': True
            }
        except Exception as e:
            print(f"Error uploading to Cloudinary: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def delete_photo(public_id):
        """Delete photo from Cloudinary"""
        try:
            result = cloudinary.uploader.destroy(public_id)
            return result.get('result') == 'ok'
        except Exception as e:
            print(f"Error deleting from Cloudinary: {e}")
            return False

