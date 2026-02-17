import os
import json
from flask import Flask, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_oauthlib.client import OAuth
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
db = SQLAlchemy(app)

# Define User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    google_id = db.Column(db.String(120), unique=True)

oauth = OAuth(app)

# Google OAuth Configuration
google = oauth.remote_app(
    'google',
    consumer_key=os.getenv('GOOGLE_CLIENT_ID'),
    consumer_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    request_token_params={
        'scope': 'email'
    },
    base_url='https://www.googleapis.com/oauth2/v1/',
    request_token_url=None,
    access_token_url='https://accounts.google.com/o/oauth2/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
)

jwt = JWTManager(app)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'User already exists!'}), 400
    new_user = User(
        username=data['username'],
        email=data['email'],
        password=generate_password_hash(data['password'])
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully.'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password, data['password']):
        token = create_access_token(identity={'id': user.id})
        return jsonify({'token': token}), 200
    return jsonify({'message': 'Invalid credentials!'}), 401

@app.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logout successful.'}), 200

@app.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_token = create_access_token(identity={'id': current_user['id']})
    return jsonify({'token': new_token}), 200

@app.route('/auth/google', methods=['GET'])
def google_auth():
    return google.authorize(callback=url_for('authorized', _external=True))

@app.route('/auth/google/authorized', methods=['GET'])
def authorized():
    response = google.get('userinfo')
    if response.status != 200:
        return jsonify({'message': 'Google authentication failed.'}), 400
    user_info = json.loads(response.data)
    user = User.query.filter_by(google_id=user_info['id']).first()
    if not user:
        user = User(
            username=user_info['name'],
            email=user_info['email'],
            google_id=user_info['id']
        )
        db.session.add(user)
        db.session.commit()
    token = create_access_token(identity={'id': user.id})
    return jsonify({'token': token}), 200

@google.tokengetter
def get_google_oauth_token():
    return session.get('google_token')

if __name__ == '__main__':
    app.run(debug=True)