import sqlite3
import os
from datetime import datetime
import cloudinary
import cloudinary.api

class Photo:
    def __init__(self, id=None, filename=None, cloudinary_public_id=None, 
                 cloudinary_secure_url=None, cloudinary_folder=None, created_at=None):
        self.id = id
        self.filename = filename
        self.cloudinary_public_id = cloudinary_public_id
        self.cloudinary_secure_url = cloudinary_secure_url
        self.cloudinary_folder = cloudinary_folder
        self.created_at = created_at
    
    @staticmethod
    def get_db_path():
        database_dir = os.getenv('DATABASE_DIR', '/tmp')
        return os.path.join(database_dir, 'app.db')
    
    @staticmethod
    def init_db():
        db_path = Photo.get_db_path()
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                cloudinary_public_id TEXT UNIQUE NOT NULL,
                cloudinary_secure_url TEXT NOT NULL,
                cloudinary_folder TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        # Sync with Cloudinary on startup
        Photo.sync_from_cloudinary()
    
    @staticmethod
    def sync_from_cloudinary():
        """Sync photos from Cloudinary to local database"""
        try:
            # Get all resources from Cloudinary
            resources = []
            next_cursor = None
            
            while True:
                result = cloudinary.api.resources(
                    resource_type='image',
                    type='upload',
                    max_results=500,
                    next_cursor=next_cursor
                )
                
                resources.extend(result.get('resources', []))
                next_cursor = result.get('next_cursor')
                
                if not next_cursor:
                    break
            
            # Update database with Cloudinary resources
            conn = sqlite3.connect(Photo.get_db_path())
            cursor = conn.cursor()
            
            for resource in resources:
                public_id = resource['public_id']
                secure_url = resource['secure_url']
                folder = resource.get('folder')
                filename = public_id.split('/')[-1]
                created_at = resource.get('created_at')
                
                # Insert or update photo
                cursor.execute('''
                    INSERT OR REPLACE INTO photos 
                    (cloudinary_public_id, cloudinary_secure_url, cloudinary_folder, filename, created_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (public_id, secure_url, folder, filename, created_at))
            
            # Remove photos that no longer exist in Cloudinary
            existing_public_ids = [r['public_id'] for r in resources]
            if existing_public_ids:
                placeholders = ','.join(['?' for _ in existing_public_ids])
                cursor.execute(f'''
                    DELETE FROM photos 
                    WHERE cloudinary_public_id NOT IN ({placeholders})
                ''', existing_public_ids)
            else:
                # No photos in Cloudinary, clear database
                cursor.execute('DELETE FROM photos')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error syncing from Cloudinary: {e}")
    
    @staticmethod
    def create(filename, cloudinary_public_id, cloudinary_secure_url, cloudinary_folder=None):
        conn = sqlite3.connect(Photo.get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO photos (filename, cloudinary_public_id, cloudinary_secure_url, cloudinary_folder)
            VALUES (?, ?, ?, ?)
        ''', (filename, cloudinary_public_id, cloudinary_secure_url, cloudinary_folder))
        
        photo_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return Photo.get_by_id(photo_id)
    
    @staticmethod
    def get_all():
        conn = sqlite3.connect(Photo.get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, filename, cloudinary_public_id, cloudinary_secure_url, 
                   cloudinary_folder, created_at
            FROM photos
            ORDER BY created_at DESC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        photos = []
        for row in rows:
            photos.append(Photo(
                id=row[0],
                filename=row[1],
                cloudinary_public_id=row[2],
                cloudinary_secure_url=row[3],
                cloudinary_folder=row[4],
                created_at=datetime.fromisoformat(row[5]) if row[5] else None
            ))
        
        return photos
    
    @staticmethod
    def get_by_collection(collection_id):
        conn = sqlite3.connect(Photo.get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, filename, cloudinary_public_id, cloudinary_secure_url, 
                   cloudinary_folder, created_at
            FROM photos
            WHERE cloudinary_folder = ?
            ORDER BY created_at DESC
        ''', (collection_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        photos = []
        for row in rows:
            photos.append(Photo(
                id=row[0],
                filename=row[1],
                cloudinary_public_id=row[2],
                cloudinary_secure_url=row[3],
                cloudinary_folder=row[4],
                created_at=datetime.fromisoformat(row[5]) if row[5] else None
            ))
        
        return photos
    
    @staticmethod
    def get_by_id(photo_id):
        conn = sqlite3.connect(Photo.get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, filename, cloudinary_public_id, cloudinary_secure_url, 
                   cloudinary_folder, created_at
            FROM photos
            WHERE id = ?
        ''', (photo_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return Photo(
                id=row[0],
                filename=row[1],
                cloudinary_public_id=row[2],
                cloudinary_secure_url=row[3],
                cloudinary_folder=row[4],
                created_at=datetime.fromisoformat(row[5]) if row[5] else None
            )
        
        return None
    
    @staticmethod
    def update_collection(photo_id, collection_id, new_public_id, new_secure_url):
        conn = sqlite3.connect(Photo.get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE photos 
            SET cloudinary_folder = ?, cloudinary_public_id = ?, cloudinary_secure_url = ?
            WHERE id = ?
        ''', (collection_id, new_public_id, new_secure_url, photo_id))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def delete(photo_id):
        conn = sqlite3.connect(Photo.get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM photos WHERE id = ?', (photo_id,))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_collection_preview(collection_id):
        """Get the first photo from a collection for preview"""
        conn = sqlite3.connect(Photo.get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT cloudinary_secure_url
            FROM photos
            WHERE cloudinary_folder = ?
            ORDER BY created_at DESC
            LIMIT 1
        ''', (collection_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        return row[0] if row else None

