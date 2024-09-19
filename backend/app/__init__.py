# backend/app/__init__.py

from flask import Flask
from .extensions import db, migrate, cors, swagger
from .blueprints.main import main_bp
from flasgger import Swagger

def create_app(config_class='app.config.Config'):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for development
    swagger.init_app(app)

    # Register blueprints
    app.register_blueprint(main_bp)

    return app
