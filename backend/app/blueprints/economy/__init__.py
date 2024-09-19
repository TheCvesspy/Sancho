# backend/app/blueprints/economy/__init__.py

from flask import Blueprint

economy_bp = Blueprint('economy', __name__, url_prefix='/economy')

from . import routes
