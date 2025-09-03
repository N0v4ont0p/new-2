from flask import Blueprint, request, jsonify
from src.models.photo import Photo, CloudinaryManager
from src.routes.auth import require_auth

photos_bp = Blueprint('photos', __name__)

@photos_bp.route('', methods=['GET'])
def get_photos():
    """Get all photos or photos by collection"""
    collection_name = request.args.get('collection')
    
    if collection_name:
        photos = Photo.get_by_collection(collection_name)
    else:
        photos = Photo.get_all()
    
    return jsonify({
        'success': True,
        'photos': [photo.to_dict() for photo in photos]
    })

@photos_bp.route('/upload', methods=['POST'])
@require_auth
def upload_photo():
    """Upload a new photo"""
    if 'photo' not in request.files:
        return jsonify({'success': False, 'message': 'No photo file provided'}), 400
    
    file = request.files['photo']
    collection_name = request.form.get('collection_name')
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    # Upload to Cloudinary
    upload_result = CloudinaryManager.upload_photo(file, collection_name)
    
    if not upload_result['success']:
        return jsonify({'success': False, 'message': upload_result['error']}), 500
    
    # Save to database
    photo = Photo.create(
        filename=file.filename,
        cloudinary_public_id=upload_result['public_id'],
        cloudinary_secure_url=upload_result['secure_url'],
        collection_name=collection_name
    )
    
    return jsonify({
        'success': True,
        'message': 'Photo uploaded successfully',
        'photo': photo.to_dict()
    })

@photos_bp.route('/<int:photo_id>', methods=['DELETE'])
@require_auth
def delete_photo(photo_id):
    """Delete a photo"""
    success = Photo.delete_by_id(photo_id)
    
    if success:
        return jsonify({'success': True, 'message': 'Photo deleted successfully'})
    else:
        return jsonify({'success': False, 'message': 'Photo not found'}), 404

@photos_bp.route('/bulk-delete', methods=['POST'])
@require_auth
def bulk_delete_photos():
    """Delete multiple photos"""
    data = request.get_json()
    photo_ids = data.get('photo_ids', [])
    
    if not photo_ids:
        return jsonify({'success': False, 'message': 'No photo IDs provided'}), 400
    
    deleted_count = 0
    for photo_id in photo_ids:
        if Photo.delete_by_id(photo_id):
            deleted_count += 1
    
    return jsonify({
        'success': True,
        'message': f'Deleted {deleted_count} photos successfully',
        'deleted_count': deleted_count
    })

@photos_bp.route('/<int:photo_id>/move', methods=['PUT'])
@require_auth
def move_photo(photo_id):
    """Move photo to different collection"""
    data = request.get_json()
    new_collection = data.get('collection_name')
    
    photo = Photo.query.get(photo_id)
    if not photo:
        return jsonify({'success': False, 'message': 'Photo not found'}), 404
    
    photo.collection_name = new_collection
    from src.models.photo import db
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Photo moved successfully',
        'photo': photo.to_dict()
    })

