# backend/app/blueprints/main/routes.py

from flask import jsonify
from flasgger import swag_from
from . import main_bp

@main_bp.route('/')
@swag_from({
    'responses': {
        200: {
            'description': 'Landing Page',
            'content': {
                'application/json': {
                    'example': {"message": "Welcome to Sancho!"}
                }
            }
        }
    }
})
def landing_page():
    return jsonify({"message": "Welcome to Sancho!"})

@main_bp.route('/header')
@swag_from({
    'responses': {
        200: {
            'description': 'Global Header',
            'content': {
                'application/json': {
                    'example': {"logo": "Sancho Logo URL", "name": "Sancho"}
                }
            }
        }
    }
})
def header():
    return jsonify({"logo": "Sancho Logo URL", "name": "Sancho"})

@main_bp.route('/api/landing', methods=['GET'])
@swag_from({
    'responses': {
        200: {
            'description': 'Landing Page Message',
            'content': {
                'application/json': {
                    'example': {"message": "Welcome to Sancho!"}
                }
            }
        }
    }
})
def api_landing_page():
    return jsonify({"message": "Welcome to Sancho!"})
