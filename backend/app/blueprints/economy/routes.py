# backend/app/blueprints/economy/routes.py

from flask import request, jsonify
from flasgger import swag_from
from . import economy_bp
from app.models.basic_item import BasicItem
from app.models.complex_item import ComplexItem, ComplexItemBasicItem
from app.models.rarity import RarityEnum
from app.extensions import db


# -------------------
# BasicItem Endpoints
# -------------------

@economy_bp.route('/basic-items', methods=['POST'])
@swag_from({
    'tags': ['Basic Items'],
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'unit_point_price': {'type': 'number'},
                    'pack_size': {'type': 'integer'},
                    'pack_price': {'type': 'number'},
                    'buy_out_price': {'type': 'number'}
                },
                'required': ['name', 'unit_point_price', 'pack_size', 'pack_price', 'buy_out_price']
            }
        }
    ],
    'responses': {
        201: {'description': 'Basic Item Created'},
        400: {'description': 'Invalid Input'}
    }
})
def create_basic_item():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    # Validate required fields
    required_fields = ['name', 'unit_point_price', 'pack_size', 'pack_price', 'buy_out_price']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400

    # Check for duplicate name
    if BasicItem.query.filter_by(name=data['name']).first():
        return jsonify({'message': 'Basic Item with this name already exists'}), 400

    basic_item = BasicItem(
        name=data['name'],
        unit_point_price=data['unit_point_price'],
        pack_size=data['pack_size'],
        pack_price=data['pack_price'],
        buy_out_price=data['buy_out_price']
    )

    db.session.add(basic_item)
    db.session.commit()

    return jsonify({'message': 'Basic Item Created', 'basic_item': basic_item.id}), 201


@economy_bp.route('/basic-items', methods=['GET'])
@swag_from({
    'tags': ['Basic Items'],
    'responses': {
        200: {
            'description': 'List of Basic Items',
            'content': {
                'application/json': {
                    'example': {
                        'basic_items': [
                            {
                                'id': 1,
                                'name': 'Iron Ore',
                                'unit_point_price': 10.5,
                                'pack_size': 20,
                                'pack_price': 200,
                                'buy_out_price': 180
                            }
                        ]
                    }
                }
            }
        }
    }
})
def get_basic_items():
    basic_items = BasicItem.query.all()
    result = []
    for item in basic_items:
        result.append({
            'id': item.id,
            'name': item.name,
            'unit_point_price': item.unit_point_price,
            'pack_size': item.pack_size,
            'pack_price': item.pack_price,
            'buy_out_price': item.buy_out_price
        })
    return jsonify({'basic_items': result}), 200


@economy_bp.route('/basic-items/<int:item_id>', methods=['GET'])
@swag_from({
    'tags': ['Basic Items'],
    'parameters': [
        {
            'name': 'item_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID of the Basic Item'
        }
    ],
    'responses': {
        200: {
            'description': 'Basic Item Details',
            'content': {
                'application/json': {
                    'example': {
                        'id': 1,
                        'name': 'Iron Ore',
                        'unit_point_price': 10.5,
                        'pack_size': 20,
                        'pack_price': 200,
                        'buy_out_price': 180
                    }
                }
            }
        },
        404: {'description': 'Basic Item Not Found'}
    }
})
def get_basic_item(item_id):
    item = BasicItem.query.get_or_404(item_id)
    return jsonify({
        'id': item.id,
        'name': item.name,
        'unit_point_price': item.unit_point_price,
        'pack_size': item.pack_size,
        'pack_price': item.pack_price,
        'buy_out_price': item.buy_out_price
    }), 200


@economy_bp.route('/basic-items/<int:item_id>', methods=['PUT'])
@swag_from({
    'tags': ['Basic Items'],
    'parameters': [
        {
            'name': 'item_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID of the Basic Item'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'unit_point_price': {'type': 'number'},
                    'pack_size': {'type': 'integer'},
                    'pack_price': {'type': 'number'},
                    'buy_out_price': {'type': 'number'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Basic Item Updated'},
        400: {'description': 'Invalid Input'},
        404: {'description': 'Basic Item Not Found'}
    }
})
def update_basic_item(item_id):
    item = BasicItem.query.get_or_404(item_id)
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    # Update fields if present
    for field in ['name', 'unit_point_price', 'pack_size', 'pack_price', 'buy_out_price']:
        if field in data:
            setattr(item, field, data[field])

    db.session.commit()
    return jsonify({'message': 'Basic Item Updated'}), 200


@economy_bp.route('/basic-items/<int:item_id>', methods=['DELETE'])
@swag_from({
    'tags': ['Basic Items'],
    'parameters': [
        {
            'name': 'item_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID of the Basic Item'
        }
    ],
    'responses': {
        200: {'description': 'Basic Item Deleted'},
        404: {'description': 'Basic Item Not Found'}
    }
})
def delete_basic_item(item_id):
    item = BasicItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Basic Item Deleted'}), 200


# -------------------
# ComplexItem Endpoints
# -------------------

@economy_bp.route('/complex-items', methods=['POST'])
@swag_from({
    'tags': ['Complex Items'],
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'basic_item_ids': {
                        'type': 'array',
                        'items': {'type': 'integer'}
                    },
                    'total_price': {'type': 'number'},
                    'buy_out_price': {'type': 'number'},
                    'special_conditions': {'type': 'string'},
                    'rarity': {
                        'type': 'string',
                        'enum': ['Common', 'Uncommon', 'Rare', 'Legendary', 'Artefact']
                    }
                },
                'required': ['name', 'basic_item_ids', 'total_price', 'buy_out_price', 'rarity']
            }
        }
    ],
    'responses': {
        201: {'description': 'Complex Item Created'},
        400: {'description': 'Invalid Input'}
    }
})
def create_complex_item():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    # Validate required fields
    required_fields = ['name', 'basic_item_ids', 'total_price', 'buy_out_price', 'rarity']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400

    # Validate rarity
    try:
        rarity = RarityEnum(data['rarity'])
    except ValueError:
        return jsonify({'message': 'Invalid rarity value'}), 400

    # Check for duplicate name
    if ComplexItem.query.filter_by(name=data['name']).first():
        return jsonify({'message': 'Complex Item with this name already exists'}), 400

    # Validate basic_item_ids
    basic_items = BasicItem.query.filter(BasicItem.id.in_(data['basic_item_ids'])).all()
    if len(basic_items) != len(data['basic_item_ids']):
        return jsonify({'message': 'One or more Basic Items not found'}), 400

    complex_item = ComplexItem(
        name=data['name'],
        total_price=data['total_price'],
        buy_out_price=data['buy_out_price'],
        special_conditions=data.get('special_conditions', ''),
        rarity=rarity
    )

    db.session.add(complex_item)
    db.session.commit()  # Commit to generate complex_item.id

    # Associate Basic Items
    for basic_item in basic_items:
        association = ComplexItemBasicItem(
            complex_item_id=complex_item.id,
            basic_item_id=basic_item.id
        )
        db.session.add(association)

    db.session.commit()

    return jsonify({'message': 'Complex Item Created', 'complex_item': complex_item.id}), 201


@economy_bp.route('/complex-items', methods=['GET'])
@swag_from({
    'tags': ['Complex Items'],
    'responses': {
        200: {
            'description': 'List of Complex Items',
            'content': {
                'application/json': {
                    'example': {
                        'complex_items': [
                            {
                                'id': 1,
                                'name': 'Steel Sword',
                                'total_price': 150.0,
                                'buy_out_price': 130.0,
                                'special_conditions': 'Requires 10 Strength',
                                'rarity': 'Rare',
                                'basic_items': [1, 2]
                            }
                        ]
                    }
                }
            }
        }
    }
})
def get_complex_items():
    complex_items = ComplexItem.query.all()
    result = []
    for item in complex_items:
        result.append({
            'id': item.id,
            'name': item.name,
            'total_price': item.total_price,
            'buy_out_price': item.buy_out_price,
            'special_conditions': item.special_conditions,
            'rarity': item.rarity.value,
            'basic_items': [assoc.basic_item_id for assoc in item.basic_items]
        })
    return jsonify({'complex_items': result}), 200


@economy_bp.route('/complex-items/<int:item_id>', methods=['GET'])
@swag_from({
    'tags': ['Complex Items'],
    'parameters': [
        {
            'name': 'item_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID of the Complex Item'
        }
    ],
    'responses': {
        200: {
            'description': 'Complex Item Details',
            'content': {
                'application/json': {
                    'example': {
                        'id': 1,
                        'name': 'Steel Sword',
                        'total_price': 150.0,
                        'buy_out_price': 130.0,
                        'special_conditions': 'Requires 10 Strength',
                        'rarity': 'Rare',
                        'basic_items': [1, 2]
                    }
                }
            }
        },
        404: {'description': 'Complex Item Not Found'}
    }
})
def get_complex_item(item_id):
    item = ComplexItem.query.get_or_404(item_id)
    return jsonify({
        'id': item.id,
        'name': item.name,
        'total_price': item.total_price,
        'buy_out_price': item.buy_out_price,
        'special_conditions': item.special_conditions,
        'rarity': item.rarity.value,
        'basic_items': [assoc.basic_item_id for assoc in item.basic_items]
    }), 200


@economy_bp.route('/complex-items/<int:item_id>', methods=['PUT'])
@swag_from({
    'tags': ['Complex Items'],
    'parameters': [
        {
            'name': 'item_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID of the Complex Item'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'basic_item_ids': {
                        'type': 'array',
                        'items': {'type': 'integer'}
                    },
                    'total_price': {'type': 'number'},
                    'buy_out_price': {'type': 'number'},
                    'special_conditions': {'type': 'string'},
                    'rarity': {
                        'type': 'string',
                        'enum': ['Common', 'Uncommon', 'Rare', 'Legendary', 'Artefact']
                    }
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Complex Item Updated'},
        400: {'description': 'Invalid Input'},
        404: {'description': 'Complex Item Not Found'}
    }
})
def update_complex_item(item_id):
    item = ComplexItem.query.get_or_404(item_id)
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    # Update fields if present
    if 'name' in data:
        item.name = data['name']
    if 'total_price' in data:
        item.total_price = data['total_price']
    if 'buy_out_price' in data:
        item.buy_out_price = data['buy_out_price']
    if 'special_conditions' in data:
        item.special_conditions = data['special_conditions']
    if 'rarity' in data:
        try:
            item.rarity = RarityEnum(data['rarity'])
        except ValueError:
            return jsonify({'message': 'Invalid rarity value'}), 400

    # Update basic items if provided
    if 'basic_item_ids' in data:
        basic_items = BasicItem.query.filter(BasicItem.id.in_(data['basic_item_ids'])).all()
        if len(basic_items) != len(data['basic_item_ids']):
            return jsonify({'message': 'One or more Basic Items not found'}), 400

        # Clear existing associations
        ComplexItemBasicItem.query.filter_by(complex_item_id=item.id).delete()

        # Add new associations
        for basic_item in basic_items:
            association = ComplexItemBasicItem(
                complex_item_id=item.id,
                basic_item_id=basic_item.id
            )
            db.session.add(association)

    db.session.commit()
    return jsonify({'message': 'Complex Item Updated'}), 200


@economy_bp.route('/complex-items/<int:item_id>', methods=['DELETE'])
@swag_from({
    'tags': ['Complex Items'],
    'parameters': [
        {
            'name': 'item_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID of the Complex Item'
        }
    ],
    'responses': {
        200: {'description': 'Complex Item Deleted'},
        404: {'description': 'Complex Item Not Found'}
    }
})
def delete_complex_item(item_id):
    item = ComplexItem.query.get_or_404(item_id)
    # Delete associations first
    ComplexItemBasicItem.query.filter_by(complex_item_id=item.id).delete()
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Complex Item Deleted'}), 200
