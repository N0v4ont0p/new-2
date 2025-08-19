import os
import cloudinary
import cloudinary.uploader
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from src.models.photo import db, Photo, Collection
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

photos_bp = Blueprint('photos', __name__)

def allowed_file(filename):
    """Check if file extension is allowed"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@photos_bp.route('/photos', methods=['GET'])
def get_photos():
    """Get all photos with optional collection filtering"""
    try:
        collection_id = request.args.get('collection_id')
        
        if collection_id:
            try:
                collection_id = int(collection_id)
                photos = Photo.query.filter_by(collection_id=collection_id).order_by(Photo.uploaded_at.desc()).all()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid collection ID'
                }), 400
        else:
            photos = Photo.query.order_by(Photo.uploaded_at.desc()).all()
        
        return jsonify({
            'success': True,
            'photos': [photo.to_dict() for photo in photos]
        })
    except Exception as e:
        print(f"Error getting photos: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch photos'
        }), 500

@photos_bp.route('/photos', methods=['POST'])
def upload_photos():
    """Upload multiple photos to Cloudinary and save metadata to database"""
    try:
        # Check if files are present
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No files provided'
            }), 400
        
        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            return jsonify({
                'success': False,
                'error': 'No files selected'
            }), 400
        
        # Get form data
        titles = request.form.getlist('titles')
        descriptions = request.form.getlist('descriptions')
        collection_id = request.form.get('collection_id')
        
        # Validate collection if provided
        collection = None
        if collection_id and collection_id != '' and collection_id != 'null':
            try:
                collection_id = int(collection_id)
                collection = Collection.query.get(collection_id)
                if not collection:
                    return jsonify({
                        'success': False,
                        'error': 'Collection not found'
                    }), 404
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid collection ID'
                }), 400
        else:
            collection_id = None
        
        uploaded_photos = []
        
        for i, file in enumerate(files):
            if file and file.filename:
                # Validate file type
                if not allowed_file(file.filename):
                    continue  # Skip invalid files
                
                try:
                    # Get metadata for this photo
                    title = titles[i] if i < len(titles) and titles[i] else secure_filename(file.filename)
                    description = descriptions[i] if i < len(descriptions) and descriptions[i] else ''
                    
                    # Upload to Cloudinary
                    upload_result = cloudinary.uploader.upload(
                        file,
                        folder="photo_gallery",
                        resource_type="image",
                        quality="auto",
                        fetch_format="auto"
                    )
                    
                    # Save to database
                    photo = Photo(
                        title=title,
                        description=description,
                        filename=secure_filename(file.filename),
                        cloudinary_public_id=upload_result['public_id'],
                        cloudinary_url=upload_result['secure_url'],
                        collection_id=collection_id
                    )
                    
                    db.session.add(photo)
                    uploaded_photos.append(photo)
                    
                except Exception as upload_error:
                    print(f"Error uploading file {file.filename}: {str(upload_error)}")
                    continue  # Skip this file and continue with others
        
        if not uploaded_photos:
            return jsonify({
                'success': False,
                'error': 'No valid files were uploaded'
            }), 400
        
        # Commit all successful uploads
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully uploaded {len(uploaded_photos)} photos',
            'photos': [photo.to_dict() for photo in uploaded_photos]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error uploading photos: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to upload photos'
        }), 500

@photos_bp.route('/photos/<int:photo_id>', methods=['DELETE'])
def delete_photo(photo_id):
    """Delete a photo from Cloudinary and database"""
    try:
        photo = Photo.query.get(photo_id)
        if not photo:
            return jsonify({
                'success': False,
                'error': 'Photo not found'
            }), 404
        
        # Delete from Cloudinary
        try:
            cloudinary.uploader.destroy(photo.cloudinary_public_id)
        except Exception as cloudinary_error:
            print(f"Error deleting from Cloudinary: {str(cloudinary_error)}")
            # Continue with database deletion even if Cloudinary fails
        
        # Delete from database
        db.session.delete(photo)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Photo deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting photo: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete photo'
        }), 500

@photos_bp.route('/photos/<int:photo_id>', methods=['PUT'])
def update_photo(photo_id):
    """Update photo metadata"""
    try:
        photo = Photo.query.get(photo_id)
        if not photo:
            return jsonify({
                'success': False,
                'error': 'Photo not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'title' in data:
            photo.title = data['title']
        if 'description' in data:
            photo.description = data['description']
        if 'collection_id' in data:
            collection_id = data['collection_id']
            if collection_id:
                collection = Collection.query.get(collection_id)
                if not collection:
                    return jsonify({
                        'success': False,
                        'error': 'Collection not found'
                    }), 404
                photo.collection_id = collection_id
            else:
                photo.collection_id = None
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Photo updated successfully',
            'photo': photo.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating photo: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to update photo'
        }), 500

@photos_bp.route('/photos/bulk-update', methods=['POST'])
def bulk_update_photos():
    """Bulk update photos (assign to collection or delete)"""
    try:
        data = request.get_json()
        photo_ids = data.get('photo_ids', [])
        action = data.get('action')
        
        if not photo_ids:
            return jsonify({
                'success': False,
                'error': 'No photos selected'
            }), 400
        
        photos = Photo.query.filter(Photo.id.in_(photo_ids)).all()
        if not photos:
            return jsonify({
                'success': False,
                'error': 'No valid photos found'
            }), 404
        
        if action == 'assign_collection':
            collection_id = data.get('collection_id')
            if collection_id:
                collection = Collection.query.get(collection_id)
                if not collection:
                    return jsonify({
                        'success': False,
                        'error': 'Collection not found'
                    }), 404
            
            for photo in photos:
                photo.collection_id = collection_id
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Successfully updated {len(photos)} photos'
            })
        
        elif action == 'delete':
            # Delete from Cloudinary and database
            deleted_count = 0
            for photo in photos:
                try:
                    cloudinary.uploader.destroy(photo.cloudinary_public_id)
                except Exception as cloudinary_error:
                    print(f"Error deleting from Cloudinary: {str(cloudinary_error)}")
                
                db.session.delete(photo)
                deleted_count += 1
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Successfully deleted {deleted_count} photos'
            })
        
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid action'
            }), 400
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in bulk update: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to update photos'
        }), 500

