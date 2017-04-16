from base import *
from flask import jsonify, request, abort
from user import User
from thing import Thing
from flask_login import login_user, login_required, current_user
import json
import boto3
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)
logger.addHandler(logging.FileHandler('debug.log'))
logger.setLevel(logging.DEBUG)

@loginManager.user_loader
def loadUser(userID):
    return User.query.filter(User.id == userID).one_or_none()

@app.route('/')
def index():
    return 'Sanity check'

@app.route('/login', methods=['POST'])
def login():
    email = request.form['email']
    password = request.form['password']

    user = db.session.query(User).filter(User.email == email).one_or_none()
    if user is None:
        return jsonify(success=False, message="Invalid username/password")

    # check password
    if user.checkPassword(password):
        # get Cognito access token
        try:
            r = cognito.get_open_id_token_for_developer_identity(
                IdentityPoolId=app.config['IDENTITY_POOL_ID'],
                IdentityId=user.cognitoID,
                Logins={
                    'login.cse521': str(user.id)
                })
        except ClientError as e:
            logger.debug('Error getting Cognito access token: {}'.format(e))
            return jsonify(success=False)

        r['success'] = True
            
        login_user(user)

        return jsonify(r) 

    return jsonify(success=False, message="Invalid username/password")

@app.route('/register', methods=['POST'])
def register():
    email = request.form['email']
    password = request.form['password']

    if len(email) == 0 or len(password) == 0:
        return jsonify(success=False, message="Invalid username/password")

    # check if a user with this email already exists
    existing = db.session.query(User).filter(User.email == email).one_or_none()
    if existing is not None:
        return jsonify(success=False, message="A user with this email already exists")

    user = User(email=email, password=password)
    db.session.add(user)
    db.session.commit()

    # create Cognito mapping
    try:
        r = cognito.get_open_id_token_for_developer_identity(
            IdentityPoolId=app.config['IDENTITY_POOL_ID'],
            Logins={
                'login.cse521': str(user.id)
            })
    except ClientError as e:
        logger.debug('Error creating Cognito mapping: {}'.format(e))
        # clean up
        db.session.delete(user)
        db.session.commit()
        return jsonify(success=False)

    user.cognitoID = r['IdentityId']
    db.session.commit()
    
    r['success'] = True

    login_user(user)

    return jsonify(r)

@app.route('/pair', methods=['POST'])
@login_required
def pair():
    thing = request.form['thing']

    # check if the authenticated user has already paired with this thing
    if len(filter(lambda x: x.name == thing, current_user.things)) > 0:
        return jsonify(success=True)

    # TODO: implement secure pairing via a pairing code 
    # Will involve fetching the pairing code from the thing's shadow state
    # code = request.form['code']

    # create the policy that gives the authenticated user access to the thing
    policy = {
        'Version': '2012-10-17',
        'Statement': [{
            'Effect': 'Allow',
            'Action': [ 'iot:UpdateThingShadow', 'iot:GetThingShadow', 'iot:DeleteThingShadow' ],
            'Resource': Thing.fullyQualifiedName(thing)
        }]
    }

    policyName = str(current_user.id) + '_' + thing

    iot = boto3.client('iot')

    try:
        r = iot.create_policy(policyName=policyName, policyDocument=json.dumps(policy))
    except ClientError as e:
        logger.debug('pair: Error creating policy: {}'.format(e))
        return jsonify(success=False)

    # attach the policy to the authenticated user
    try:
        iot.attach_principal_policy(policyName=policyName, principal=current_user.cognitoID)
    except ClientError as e:
        logger.debug('pair: Error attaching policy {} to principal {}: {}'.format(policyName, current_user.cognitoID, e))
        return jsonify(success=False)

    current_user.things.append(Thing(name=thing))
    db.session.commit()

    return jsonify(success=True)

    
