import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import mimetypes
import shutil
from flask import Flask, jsonify, send_file, send_from_directory, request
from flask_cors import CORS
from PIL import Image
import pillow_heif
from io import BytesIO
from werkzeug.utils import secure_filename

# Register HEIF opener with Pillow
pillow_heif.register_heif_opener()

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
CORS(app)

# Configuration
COLLECTIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'collections')
SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif'}

def ensure_collections_dir():
    """Ensure collections directory exists"""
    if not os.path.exists(COLLECTIONS_DIR):
        os.makedirs(COLLECTIONS_DIR)

def is_image_file(filename):
    """Check if file is a supported image format"""
    return os.path.splitext(filename.lower())[1] in SUPPORTED_FORMATS

def get_collections():
    """Get all collections (folders) from the collections directory"""
    ensure_collections_dir()
    collections = []
    
    for item in os.listdir(COLLECTIONS_DIR):
        collection_path = os.path.join(COLLECTIONS_DIR, item)
        if os.path.isdir(collection_path):
            # Count photos in collection
            photos = [f for f in os.listdir(collection_path) if is_image_file(f)]
            
            # Get preview image (first photo)
            preview_url = None
            if photos:
                preview_url = f"/api/photo/{item}/{photos[0]}"
            
            collections.append({
                'name': item,
                'photo_count': len(photos),
                'preview_url': preview_url
            })
    
    return collections

def get_collection_photos(collection_name):
    """Get all photos from a specific collection"""
    collection_path = os.path.join(COLLECTIONS_DIR, collection_name)
    
    if not os.path.exists(collection_path) or not os.path.isdir(collection_path):
        return []
    
    photos = []
    for filename in os.listdir(collection_path):
        if is_image_file(filename):
            photos.append({
                'filename': filename,
                'url': f"/api/photo/{collection_name}/{filename}",
                'collection': collection_name
            })
    
    return photos

def process_image_for_display(image_path, max_width=800, max_height=600):
    """Process image for optimal display - resize and optimize"""
    try:
        with Image.open(image_path) as img:
            # Convert HEIC to RGB if needed
            if img.format in ['HEIF', 'HEIC']:
                img = img.convert('RGB')
            
            # Calculate new size maintaining aspect ratio
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # Save to BytesIO
            output = BytesIO()
            format_to_save = 'JPEG' if img.format in ['HEIF', 'HEIC'] else img.format or 'JPEG'
            img.save(output, format=format_to_save, quality=85, optimize=True)
            output.seek(0)
            
            return output, format_to_save.lower()
    except Exception as e:
        print(f"Error processing image {image_path}: {e}")
        return None, None

# API Routes
@app.route('/api/collections')
def api_collections():
    """API endpoint to get all collections"""
    try:
        collections = get_collections()
        return jsonify({
            'success': True,
            'collections': collections
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/collections/<collection_name>/photos')
def api_collection_photos(collection_name):
    """API endpoint to get photos from a specific collection"""
    try:
        photos = get_collection_photos(collection_name)
        return jsonify({
            'success': True,
            'photos': photos,
            'collection_name': collection_name
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/photo/<collection_name>/<filename>')
def api_photo(collection_name, filename):
    """Serve individual photos with processing for optimal display"""
    try:
        image_path = os.path.join(COLLECTIONS_DIR, collection_name, filename)
        
        if not os.path.exists(image_path):
            return jsonify({'error': 'Photo not found'}), 404
        
        # Process image for optimal display
        processed_image, format_type = process_image_for_display(image_path)
        
        if processed_image is None:
            # Fallback to original file if processing fails
            return send_file(image_path)
        
        # Determine MIME type
        mime_type = f'image/{format_type}'
        
        return send_file(
            processed_image,
            mimetype=mime_type,
            as_attachment=False,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/photo/<collection_name>/<filename>/download')
def api_photo_download(collection_name, filename):
    """Download original photo file"""
    try:
        image_path = os.path.join(COLLECTIONS_DIR, collection_name, filename)
        
        if not os.path.exists(image_path):
            return jsonify({'error': 'Photo not found'}), 404
        
        return send_file(
            image_path,
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin API Routes
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        # Check password (in production, use proper hashing)
        if password == 'Hanshow99@':
            return jsonify({
                'success': True,
                'message': 'Login successful'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid password'
            }), 401
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/admin/collections', methods=['POST'])
def create_collection():
    """Create a new collection"""
    try:
        data = request.get_json()
        collection_name = data.get('name', '').strip()
        
        if not collection_name:
            return jsonify({
                'success': False,
                'message': 'Collection name is required'
            }), 400
        
        # Sanitize collection name
        collection_name = secure_filename(collection_name)
        collection_path = os.path.join(COLLECTIONS_DIR, collection_name)
        
        if os.path.exists(collection_path):
            return jsonify({
                'success': False,
                'message': 'Collection already exists'
            }), 400
        
        os.makedirs(collection_path)
        
        return jsonify({
            'success': True,
            'message': f'Collection "{collection_name}" created successfully',
            'collection_name': collection_name
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/admin/collections/<collection_name>', methods=['DELETE'])
def delete_collection(collection_name):
    """Delete a collection and all its photos"""
    try:
        collection_path = os.path.join(COLLECTIONS_DIR, collection_name)
        
        if not os.path.exists(collection_path):
            return jsonify({
                'success': False,
                'message': 'Collection not found'
            }), 404
        
        shutil.rmtree(collection_path)
        
        return jsonify({
            'success': True,
            'message': f'Collection "{collection_name}" deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/admin/upload', methods=['POST'])
def upload_photos():
    """Upload photos to a collection"""
    try:
        collection_name = request.form.get('collection')
        if not collection_name:
            return jsonify({
                'success': False,
                'message': 'Collection name is required'
            }), 400
        
        collection_path = os.path.join(COLLECTIONS_DIR, collection_name)
        if not os.path.exists(collection_path):
            return jsonify({
                'success': False,
                'message': 'Collection does not exist'
            }), 404
        
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No files provided'
            }), 400
        
        files = request.files.getlist('files')
        uploaded_files = []
        errors = []
        
        for file in files:
            if file.filename == '':
                continue
                
            if file and is_image_file(file.filename):
                try:
                    filename = secure_filename(file.filename)
                    # Ensure unique filename
                    counter = 1
                    base_name, ext = os.path.splitext(filename)
                    while os.path.exists(os.path.join(collection_path, filename)):
                        filename = f"{base_name}_{counter}{ext}"
                        counter += 1
                    
                    file_path = os.path.join(collection_path, filename)
                    file.save(file_path)
                    uploaded_files.append(filename)
                except Exception as e:
                    errors.append(f"Failed to upload {file.filename}: {str(e)}")
            else:
                errors.append(f"Invalid file type: {file.filename}")
        
        return jsonify({
            'success': True,
            'message': f'Uploaded {len(uploaded_files)} file(s) successfully',
            'uploaded_files': uploaded_files,
            'errors': errors
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/admin/photos/<collection_name>/<filename>', methods=['DELETE'])
def delete_photo(collection_name, filename):
    """Delete a specific photo"""
    try:
        file_path = os.path.join(COLLECTIONS_DIR, collection_name, filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'message': 'Photo not found'
            }), 404
        
        os.remove(file_path)
        
        return jsonify({
            'success': True,
            'message': f'Photo "{filename}" deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# Frontend Routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    ensure_collections_dir()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
