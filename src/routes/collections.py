from flask import Blueprint, request, jsonify
from src.models.photo import Collection
from src.routes.auth import require_auth

collections_bp = Blueprint('collections', __name__)

@collections_bp.route('', methods=['GET'])
def get_collections():
    """Get all collections"""
    collections = Collection.get_all()
    return jsonify({
        'success': True,
        'collections': [collection.to_dict() for collection in collections]
    })

@collections_bp.route('', methods=['POST'])
@require_auth
def create_collection():
    """Create a new collection"""
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'success': False, 'message': 'Collection name is required'}), 400
    
    # Check if collection already exists
    existing = Collection.query.filter_by(name=name).first()
    if existing:
        return jsonify({'success': False, 'message': 'Collection already exists'}), 400
    
    collection = Collection.create(name)
    
    return jsonify({
        'success': True,
        'message': 'Collection created successfully',
        'collection': collection.to_dict()
    }), 201

@collections_bp.route('/<collection_name>', methods=['DELETE'])
@require_auth
def delete_collection(collection_name):
    """Delete a collection and all its photos"""
    success = Collection.delete_by_name(collection_name)
    
    if success:
        return jsonify({'success': True, 'message': 'Collection deleted successfully'})
    else:
        return jsonify({'success': False, 'message': 'Collection not found'}), 404

@collections_bp.route('/<collection_name>', methods=['PUT'])
@require_auth
def rename_collection(collection_name):
    """Rename a collection"""
    data = request.get_json()
    new_name = data.get('name', '').strip()
    
    if not new_name:
        return jsonify({'success': False, 'message': 'New collection name is required'}), 400
    
    collection = Collection.query.filter_by(name=collection_name).first()
    if not collection:
        return jsonify({'success': False, 'message': 'Collection not found'}), 404
    
    # Check if new name already exists
    existing = Collection.query.filter_by(name=new_name).first()
    if existing and existing.name != collection_name:
        return jsonify({'success': False, 'message': 'Collection name already exists'}), 400
    
    # Update collection name
    old_name = collection.name
    collection.name = new_name
    
    # Update all photos in this collection
    from src.models.photo import Photo, db
    photos = Photo.query.filter_by(collection_name=old_name).all()
    for photo in photos:
        photo.collection_name = new_name
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Collection renamed successfully',
        'collection': collection.to_dict()
    })

