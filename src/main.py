import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.routes.auth import auth_bp
from src.routes.photos import photos_bp
from src.routes.collections import collections_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 30  # 30 days for admin sessions

# Database configuration
database_dir = os.getenv('DATABASE_DIR', os.path.join(os.path.dirname(__file__), 'database'))
os.makedirs(database_dir, exist_ok=True)
database_path = os.path.join(database_dir, 'app.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{database_path}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enable CORS
CORS(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(photos_bp, url_prefix='/api')
app.register_blueprint(collections_bp, url_prefix='/api')

# Initialize database
db.init_app(app)
with app.app_context():
    db.create_all()
    # Sync photos from Cloudinary on startup to restore after server restarts
    from src.models.photo import Photo
    Photo.init_db()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve static files and SPA routing"""
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    # Serve admin page
    if path == 'admin' or path.startswith('admin/'):
        admin_path = os.path.join(static_folder_path, 'admin.html')
        if os.path.exists(admin_path):
            return send_from_directory(static_folder_path, 'admin.html')
    
    # Serve other static files
    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        # Serve main gallery page
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

