import os
from flask import Blueprint, request, jsonify, session
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Admin login endpoint"""
    data = request.get_json()
    password = data.get('password')
    
    admin_password = os.environ.get('ADMIN_PASSWORD', 'Hanshow99@')
    
    if password == admin_password:
        session['authenticated'] = True
        return jsonify({'success': True, 'message': 'Login successful'})
    else:
        return jsonify({'success': False, 'message': 'Invalid password'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Admin logout endpoint"""
    session.pop('authenticated', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@auth_bp.route('/status', methods=['GET'])
def status():
    """Check authentication status"""
    is_authenticated = session.get('authenticated', False)
    return jsonify({'authenticated': is_authenticated, 'success': True})

def require_auth(f):
    """Decorator to require authentication"""
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated', False):
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

