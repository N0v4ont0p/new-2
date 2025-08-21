from flask import Blueprint, request, jsonify
import re
from src.models.photo import db, CloudinaryCollectionManager

collections_bp = Blueprint('collections', __name__)

@collections_bp.route('/collections', methods=['GET'])
def get_collections():
    """Get all collections from Cloudinary folders - PERMANENT storage"""
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
def create_collection():
    """Create a new collection using Cloudinary folders - PERMANENT storage"""
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
        
        if len(name) > 100:
            return jsonify({
                'success': False,
                'error': 'Collection name is too long (max 100 characters)'
            }), 400
        
        # Create collection using Cloudinary folders
        collection, error = CloudinaryCollectionManager.create_collection(name)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 409 if 'already exists' in error else 400
        
        return jsonify({
            'success': True,
            'message': 'Collection created successfully',
            'collection': collection
        }), 201
        
    except Exception as e:
        print(f"Error creating collection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to create collection'
        }), 500

@collections_bp.route('/collections/<collection_id>', methods=['DELETE'])
def delete_collection(collection_id):
    """Delete a collection and all its photos from Cloudinary - PERMANENT deletion"""
    try:
        success, message = CloudinaryCollectionManager.delete_collection(collection_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 500
        
    except Exception as e:
        print(f"Error deleting collection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete collection'
        }), 500

@collections_bp.route('/collections/<collection_id>/photos', methods=['GET'])
def get_collection_photos(collection_id):
    """Get all photos in a specific collection - PERMANENT storage"""
    try:
        photos = CloudinaryCollectionManager.get_collection_photos(collection_id)
        collection = CloudinaryCollectionManager.get_collection_by_id(collection_id)
        
        return jsonify({
            'success': True,
            'photos': photos,
            'collection': collection
        })
        
    except Exception as e:
        print(f"Error getting collection photos: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch collection photos'
        }), 500

@collections_bp.route('/collections/<collection_id>', methods=['PUT'])
def update_collection(collection_id):
    """Update collection name - PERMANENT storage"""
    try:
        data = request.get_json()
        new_name = data.get('name', '').strip()
        
        if not new_name:
            return jsonify({
                'success': False,
                'error': 'Collection name is required'
            }), 400
        
        # For now, we don't support renaming Cloudinary folders
        # This would require moving all photos to a new folder
        return jsonify({
            'success': False,
            'error': 'Collection renaming is not supported yet'
        }), 400
        
    except Exception as e:
        print(f"Error updating collection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to update collection'
        }), 500

