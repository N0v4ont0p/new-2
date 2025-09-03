from flask import Blueprint, request, jsonify, session
import os

auth_bp = Blueprint('auth', __name__)

# Admin password from environment variable
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'Hanshow99@')

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """Admin login endpoint with cookie-based sessions"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        password = data.get('password', '')
        
        if password == ADMIN_PASSWORD:
            # Set permanent session (30 days)
            session.permanent = True
            session['admin_logged_in'] = True
            
            return jsonify({
                'success': True,
                'message': 'Login successful'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid password'
            }), 401
            
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Login failed'
        }), 500

@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    """Admin logout endpoint"""
    try:
        session.pop('admin_logged_in', None)
        session.permanent = False
        
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        })
    except Exception as e:
        print(f"Logout error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Logout failed'
        }), 500

@auth_bp.route('/auth/status', methods=['GET'])
def status():
    """Check authentication status"""
    try:
        authenticated = session.get('admin_logged_in', False)
        return jsonify({
            'success': True,
            'authenticated': authenticated
        })
    except Exception as e:
        print(f"Auth status error: {str(e)}")
        return jsonify({
            'success': False,
            'authenticated': False
        }), 500

def require_admin_auth(f):
    """Decorator to require admin authentication"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in', False):
            return jsonify({
                'success': False,
                'error': 'Admin authentication required'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

