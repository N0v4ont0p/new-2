from flask import Blueprint, request, jsonify, current_app
import cloudinary
import cloudinary.uploader
import cloudinary.api
from werkzeug.utils import secure_filename
import os
from PIL import Image
import io
import tempfile
from ..models.photo import Photo
from ..routes.auth import require_admin_auth

photos_bp = Blueprint('photos', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'heic', 'heif', 'avif', 'svg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_heic_to_jpg(file_content):
    """Convert HEIC/HEIF files to JPG format"""
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
        
        # Open HEIC file
        image = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Save as JPG
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return output.getvalue(), 'jpg'
    except Exception as e:
        current_app.logger.error(f"HEIC conversion error: {e}")
        return None, None

@photos_bp.route('/api/photos', methods=['GET'])
def get_photos():
    try:
        collection_id = request.args.get('collection_id')
        
        if collection_id:
            # Get photos from specific collection
            photos = Photo.get_by_collection(collection_id)
        else:
            # Get all photos
            photos = Photo.get_all()
        
        photos_data = []
        for photo in photos:
            photos_data.append({
                'id': photo.id,
                'filename': photo.filename,
                'cloudinary_public_id': photo.cloudinary_public_id,
                'cloudinary_secure_url': photo.cloudinary_secure_url,
                'cloudinary_folder': photo.cloudinary_folder,
                'created_at': photo.created_at.isoformat() if photo.created_at else None
            })
        
        return jsonify({
            'success': True,
            'photos': photos_data
        })
    
    except Exception as e:
        current_app.logger.error(f"Error getting photos: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get photos'
        }), 500

@photos_bp.route('/api/photos/upload', methods=['POST'])
@require_admin_auth
def upload_photo():
    try:
        if 'photo' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No photo file provided'
            }), 400
        
        file = request.files['photo']
        collection_id = request.form.get('collection_id')
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'File type not allowed'
            }), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'message': 'File too large (max 10MB)'
            }), 400
        
        # Read file content
        file_content = file.read()
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit('.', 1)[1].lower()
        
        # Handle HEIC/HEIF conversion
        if file_extension in ['heic', 'heif']:
            converted_content, new_extension = convert_heic_to_jpg(file_content)
            if converted_content:
                file_content = converted_content
                file_extension = new_extension
                filename = filename.rsplit('.', 1)[0] + '.jpg'
        
        # Create temporary file for upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Upload to Cloudinary
            upload_options = {
                'resource_type': 'image',
                'quality': 'auto:good',
                'fetch_format': 'auto'
            }
            
            if collection_id:
                upload_options['folder'] = collection_id
            
            result = cloudinary.uploader.upload(temp_file_path, **upload_options)
            
            # Save to database
            photo = Photo.create(
                filename=filename,
                cloudinary_public_id=result['public_id'],
                cloudinary_secure_url=result['secure_url'],
                cloudinary_folder=collection_id
            )
            
            return jsonify({
                'success': True,
                'message': 'Photo uploaded successfully',
                'photo': {
                    'id': photo.id,
                    'filename': photo.filename,
                    'cloudinary_secure_url': photo.cloudinary_secure_url,
                    'cloudinary_folder': photo.cloudinary_folder
                }
            })
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except Exception as e:
        current_app.logger.error(f"Upload error: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to upload photo'
        }), 500

@photos_bp.route('/api/photos/<int:photo_id>/move', methods=['PUT'])
@require_admin_auth
def move_photo(photo_id):
    try:
        data = request.get_json()
        new_collection_id = data.get('collection_id')
        
        photo = Photo.get_by_id(photo_id)
        if not photo:
            return jsonify({
                'success': False,
                'message': 'Photo not found'
            }), 404
        
        # Update Cloudinary folder
        old_public_id = photo.cloudinary_public_id
        new_public_id = f"{new_collection_id}/{old_public_id.split('/')[-1]}" if new_collection_id else old_public_id.split('/')[-1]
        
        # Rename in Cloudinary
        result = cloudinary.uploader.rename(old_public_id, new_public_id)
        
        # Update database
        Photo.update_collection(photo_id, new_collection_id, result['public_id'], result['secure_url'])
        
        return jsonify({
            'success': True,
            'message': 'Photo moved successfully'
        })
    
    except Exception as e:
        current_app.logger.error(f"Error moving photo: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to move photo'
        }), 500

@photos_bp.route('/api/photos/<int:photo_id>/remove', methods=['PUT'])
@require_admin_auth
def remove_from_collection(photo_id):
    try:
        photo = Photo.get_by_id(photo_id)
        if not photo:
            return jsonify({
                'success': False,
                'message': 'Photo not found'
            }), 404
        
        # Remove from Cloudinary folder (move to root)
        old_public_id = photo.cloudinary_public_id
        new_public_id = old_public_id.split('/')[-1]  # Remove folder prefix
        
        # Rename in Cloudinary
        result = cloudinary.uploader.rename(old_public_id, new_public_id)
        
        # Update database - remove collection association
        Photo.update_collection(photo_id, None, result['public_id'], result['secure_url'])
        
        return jsonify({
            'success': True,
            'message': 'Photo removed from collection'
        })
    
    except Exception as e:
        current_app.logger.error(f"Error removing photo from collection: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to remove photo from collection'
        }), 500

@photos_bp.route('/api/photos/<int:photo_id>', methods=['DELETE'])
@require_admin_auth
def delete_photo(photo_id):
    try:
        photo = Photo.get_by_id(photo_id)
        if not photo:
            return jsonify({
                'success': False,
                'message': 'Photo not found'
            }), 404
        
        # Delete from Cloudinary
        cloudinary.uploader.destroy(photo.cloudinary_public_id)
        
        # Delete from database
        Photo.delete(photo_id)
        
        return jsonify({
            'success': True,
            'message': 'Photo deleted successfully'
        })
    
    except Exception as e:
        current_app.logger.error(f"Error deleting photo: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete photo'
        }), 500

