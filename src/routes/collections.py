from flask import Blueprint, request, jsonify
import re
from src.models.photo import db, Collection, Photo

collections_bp = Blueprint('collections', __name__)

def validate_collection_name(name):
    """Validate collection name"""
    if not name or not isinstance(name, str):
        return False, "Collection name is required"
    
    name = name.strip()
    if len(name) < 1:
        return False, "Collection name cannot be empty"
    
    if len(name) > 100:
        return False, "Collection name is too long (max 100 characters)"
    
    # Allow letters, numbers, spaces, hyphens, underscores, and common punctuation
    if not re.match(r'^[a-zA-Z0-9\s\-_.,!?()&]+$', name):
        return False, "Collection name contains invalid characters"
    
    return True, name

@collections_bp.route('/collections', methods=['GET'])
def get_collections():
    """Get all collections with photo counts"""
    try:
        collections = Collection.query.order_by(Collection.created_at.desc()).all()
        return jsonify({
            'success': True,
            'collections': [collection.to_dict() for collection in collections]
        })
    except Exception as e:
        print(f"Error getting collections: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch collections'
        }), 500

@collections_bp.route('/collections', methods=['POST'])
def create_collection():
    """Create a new collection"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
            
        name = data.get('name', '')
        
        # Validate collection name
        is_valid, result = validate_collection_name(name)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': result
            }), 400
        
        name = result  # Use the cleaned name
        
        # Check if collection with this name already exists
        existing_collection = Collection.query.filter_by(name=name).first()
        if existing_collection:
            return jsonify({
                'success': False,
                'error': 'Collection with this name already exists'
            }), 409
        
        # Create new collection
        collection = Collection(name=name)
        db.session.add(collection)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Collection created successfully',
            'collection': collection.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating collection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to create collection'
        }), 500

@collections_bp.route('/collections/<int:collection_id>', methods=['DELETE'])
def delete_collection(collection_id):
    """Delete a collection and remove it from all associated photos"""
    try:
        collection = Collection.query.get(collection_id)
        if not collection:
            return jsonify({
                'success': False,
                'error': 'Collection not found'
            }), 404
        
        # Remove collection assignment from all photos in this collection
        photos_in_collection = Photo.query.filter_by(collection_id=collection_id).all()
        for photo in photos_in_collection:
            photo.collection_id = None
        
        # Delete the collection
        db.session.delete(collection)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Collection deleted successfully. {len(photos_in_collection)} photos were unassigned from this collection.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@collections_bp.route('/collections/<int:collection_id>', methods=['PUT'])
def update_collection(collection_id):
    """Update collection name"""
    try:
        collection = Collection.query.get(collection_id)
        if not collection:
            return jsonify({
                'success': False,
                'error': 'Collection not found'
            }), 404
        
        data = request.get_json()
        new_name = data.get('name', '').strip()
        
        if not new_name:
            return jsonify({
                'success': False,
                'error': 'Collection name is required'
            }), 400
        
        # Check if another collection with this name already exists
        existing_collection = Collection.query.filter(
            Collection.name == new_name,
            Collection.id != collection_id
        ).first()
        
        if existing_collection:
            return jsonify({
                'success': False,
                'error': 'Collection with this name already exists'
            }), 409
        
        collection.name = new_name
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Collection updated successfully',
            'collection': collection.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

