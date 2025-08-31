from flask import Blueprint, request, jsonify
from src.models.photo import CloudinaryCollectionManager
from src.routes.auth import require_admin_auth

collections_bp = Blueprint('collections', __name__)

@collections_bp.route('/collections', methods=['GET'])
def get_collections():
    """Get all collections from Cloudinary folders"""
    try:
        collections = CloudinaryCollectionManager.get_all_collections()
        return jsonify({
            'success': True,
            'collections': collections
        })
    except Exception as e:
        print(f"Error getting collections: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch collections'
        }), 500

@collections_bp.route('/collections', methods=['POST'])
@require_admin_auth
def create_collection():
    """Create a new collection"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        name = data.get('name', '').strip()
        if not name:
            return jsonify({
                'success': False,
                'error': 'Collection name is required'
            }), 400
        
        # Check if collection already exists
        existing_collections = CloudinaryCollectionManager.get_all_collections()
        folder_name = name.lower().replace(' ', '_').replace('-', '_')
        folder_name = ''.join(c for c in folder_name if c.isalnum() or c == '_')
        
        for collection in existing_collections:
            if collection['id'] == folder_name:
                return jsonify({
                    'success': False,
                    'error': 'Collection already exists'
                }), 400
        
        # Create collection
        collection = CloudinaryCollectionManager.create_collection(name)
        
        return jsonify({
            'success': True,
            'message': 'Collection created successfully',
            'collection': collection
        }), 201
        
    except Exception as e:
        print(f"Error creating collection: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to create collection: {str(e)}'
        }), 500

@collections_bp.route('/collections/<collection_id>', methods=['DELETE'])
@require_admin_auth
def delete_collection(collection_id):
    """Delete a collection and all its photos"""
    try:
        # Check if collection exists
        collection = CloudinaryCollectionManager.get_collection_by_id(collection_id)
        if not collection:
            return jsonify({
                'success': False,
                'error': 'Collection not found'
            }), 404
        
        # Delete collection
        success = CloudinaryCollectionManager.delete_collection(collection_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Collection deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to delete collection'
            }), 500
        
    except Exception as e:
        print(f"Error deleting collection: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to delete collection: {str(e)}'
        }), 500

@collections_bp.route('/collections/<collection_id>', methods=['GET'])
def get_collection(collection_id):
    """Get collection details and photos"""
    try:
        collection = CloudinaryCollectionManager.get_collection_by_id(collection_id)
        if not collection:
            return jsonify({
                'success': False,
                'error': 'Collection not found'
            }), 404
        
        photos = CloudinaryCollectionManager.get_collection_photos(collection_id)
        collection['photos'] = photos
        
        return jsonify({
            'success': True,
            'collection': collection
        })
        
    except Exception as e:
        print(f"Error getting collection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch collection'
        }), 500

