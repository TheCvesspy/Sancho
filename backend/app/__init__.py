from flask import Flask
from .extensions import db, migrate, cors, swagger
from .blueprints.main import main_bp
from .blueprints.economy import economy_bp  # Ensure Economy Blueprint is imported
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
    app.register_blueprint(economy_bp)  # Register Economy Blueprint

    return app
