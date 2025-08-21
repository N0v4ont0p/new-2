from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader
import os
from src.models.photo import db, Photo, CloudinaryCollectionManager
from PIL import Image
import io
import tempfile

photos_bp = Blueprint('photos', __name__)

# Supported file extensions including HEIC
ALLOWED_EXTENSIONS = {
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif',
    'heic', 'heif', 'avif', 'svg'
}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_heic_to_jpg(file_content):
    """Convert HEIC file to JPG format"""
    try:
        # Try to use PIL to convert HEIC
        from PIL import Image
        from pillow_heif import register_heif_opener
        
        # Register HEIF opener with PIL
        register_heif_opener()
        
        # Open HEIC image
        image = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Save as JPG
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return output.getvalue(), 'jpg'
        
    except ImportError:
        # Fallback: Upload HEIC directly to Cloudinary (it can handle conversion)
        return file_content, 'heic'
    except Exception as e:
        print(f"Error converting HEIC: {str(e)}")
        # Fallback: Upload HEIC directly to Cloudinary
        return file_content, 'heic'

@photos_bp.route('/photos', methods=['GET'])
def get_photos():
    """Get all photos or photos from a specific collection - PERMANENT storage"""
    try:
        collection_id = request.args.get('collection_id')
        
        if collection_id:
            # Get photos from specific collection
            photos = CloudinaryCollectionManager.get_collection_photos(collection_id)
        else:
            # Get all photos
            photos = Photo.query.order_by(Photo.uploaded_at.desc()).all()
            photos = [photo.to_dict() for photo in photos]
        
        return jsonify({
            'success': True,
            'photos': photos
        })
        
    except Exception as e:
        print(f"Error getting photos: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch photos'
        }), 500

@photos_bp.route('/photos', methods=['POST'])
def upload_photos():
    """Upload photos with HEIC support and permanent Cloudinary storage"""
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
        
        # Get metadata
        titles = request.form.getlist('titles')
        descriptions = request.form.getlist('descriptions')
        collection_id = request.form.get('collection_id')
        
        # Validate collection if provided
        if collection_id:
            collection = CloudinaryCollectionManager.get_collection_by_id(collection_id)
            if not collection:
                return jsonify({
                    'success': False,
                    'error': 'Invalid collection selected'
                }), 400
        
        uploaded_photos = []
        errors = []
        
        for i, file in enumerate(files):
            try:
                if not file or file.filename == '':
                    continue
                
                # Check file extension
                if not allowed_file(file.filename):
                    errors.append(f"File {file.filename}: Unsupported file type")
                    continue
                
                # Read file content
                file_content = file.read()
                if len(file_content) == 0:
                    errors.append(f"File {file.filename}: Empty file")
                    continue
                
                # Check file size (max 10MB)
                if len(file_content) > 10 * 1024 * 1024:
                    errors.append(f"File {file.filename}: File too large (max 10MB)")
                    continue
                
                # Get original filename and extension
                original_filename = secure_filename(file.filename)
                file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
                
                # Handle HEIC files
                if file_extension in ['heic', 'heif']:
                    try:
                        file_content, file_extension = convert_heic_to_jpg(file_content)
                        print(f"Converted HEIC file {original_filename} to {file_extension}")
                    except Exception as e:
                        print(f"HEIC conversion warning for {original_filename}: {str(e)}")
                        # Continue with original file - Cloudinary can handle HEIC
                
                # Prepare upload parameters
                upload_params = {
                    'resource_type': 'image',
                    'quality': 'auto:good',
                    'fetch_format': 'auto',
                    'flags': 'progressive',
                    'overwrite': False
                }
                
                # Add to collection folder if specified
                if collection_id:
                    upload_params['folder'] = collection_id
                    upload_params['public_id'] = f"{collection_id}/{original_filename.rsplit('.', 1)[0]}_{i}"
                else:
                    upload_params['public_id'] = f"uncategorized/{original_filename.rsplit('.', 1)[0]}_{i}"
                
                # Upload to Cloudinary
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    temp_file.write(file_content)
                    temp_file.flush()
                    
                    result = cloudinary.uploader.upload(
                        temp_file.name,
                        **upload_params
                    )
                    
                    # Clean up temp file
                    os.unlink(temp_file.name)
                
                # Get title and description
                title = titles[i] if i < len(titles) and titles[i] else original_filename.rsplit('.', 1)[0]
                description = descriptions[i] if i < len(descriptions) and descriptions[i] else ''
                
                # Save to database
                photo = Photo(
                    title=title,
                    description=description,
                    cloudinary_public_id=result['public_id'],
                    cloudinary_url=result['url'],
                    cloudinary_secure_url=result['secure_url'],
                    cloudinary_folder=collection_id if collection_id else None,
                    original_filename=original_filename,
                    file_format=result.get('format', file_extension),
                    file_size=result.get('bytes', len(file_content)),
                    width=result.get('width'),
                    height=result.get('height')
                )
                
                db.session.add(photo)
                uploaded_photos.append(photo.to_dict())
                
            except Exception as e:
                error_msg = f"File {file.filename}: {str(e)}"
                print(f"Upload error: {error_msg}")
                errors.append(error_msg)
                continue
        
        # Commit all successful uploads
        if uploaded_photos:
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'error': f'Database error: {str(e)}'
                }), 500
        
        # Return results
        if uploaded_photos:
            response = {
                'success': True,
                'message': f'Successfully uploaded {len(uploaded_photos)} photo(s)',
                'photos': uploaded_photos
            }
            if errors:
                response['warnings'] = errors
            return jsonify(response), 201
        else:
            return jsonify({
                'success': False,
                'error': 'No photos were uploaded successfully',
                'details': errors
            }), 400
            
    except Exception as e:
        db.session.rollback()
        print(f"Upload error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Upload failed: {str(e)}'
        }), 500

@photos_bp.route('/photos/<int:photo_id>', methods=['DELETE'])
def delete_photo(photo_id):
    """Delete a photo from both Cloudinary and database - PERMANENT deletion"""
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
        except Exception as e:
            print(f"Error deleting from Cloudinary: {str(e)}")
            # Continue with database deletion even if Cloudinary deletion fails
        
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
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Update fields
        if 'title' in data:
            photo.title = data['title']
        if 'description' in data:
            photo.description = data['description']
        
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

