from base import *
from flask import jsonify, request, abort
from user import User
from thing import Thing
from trigger import Trigger, TriggerSchema
from trigger_target import TriggerTarget, TriggerTargetSchema
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

    user = User.query.filter(User.email == email).one_or_none()
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
    existing = User.query.filter(User.email == email).one_or_none()
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

@app.route('/triggers', methods=['GET', 'POST'])
@login_required
def triggers():
    if request.method == 'POST':
        # create a new trigger 
        d = request.get_json()
        thingName = d.get('thing')
        if thingName is None:
            return jsonify(success=False, message='Must supply a thing name')

        del d['thing']

        # check if there is a thing with this name associated w/ the user
        thing = Thing.query.filter(Thing.name == thingName, Thing.userID == current_user.id).one_or_none()
        if thing is None:
            return jsonify(success=False, message='A thing with this name does not exist')

        triggerSchema = TriggerSchema()
        trigger, errors = TriggerSchema.load(d)
        if errors:
            return jsonify(success=False, error=errors)

        trigger.user = current_user
        trigger.thing = thing

        db.session.add(trigger)
        db.session.commit()
        
        # create SNS topic
        sns = boto3.client('sns')

        try:
            r = sns.create_topic(Name=str(trigger.id))
        except ClientError as e:
            # clean up
            db.session.delete(trigger)
            db.session.commit()
            logger.debug('Error creating SNS topic: {}'.format(e))
            return jsonify(success=False, message='Unable to create SNS topic')

        trigger.snsTopic = r['TopicArn']
        trigger.iotRuleName = str(trigger.id)
        db.session.commit()
        logger.debug('Created topic with ARN: {}'.format(trigger.snsTopic))
        
        # create IoT rule
        iot = boto3.client('iot')

        # build SQL string for rule
        sql = '' 
        try:
            r = iot.create_topic_rule(
                ruleName=str(trigger.id),
                topicRulePayload=dict(
                    sql=sql,
                    actions=[dict(
                        sns=dict(
                            targetArn=trigger.snsTopic,
                            roleArn=''
                        )
                    )]
                )
            )
        except ClientError as e:
            logger.debug('Error creating IoT rule: {}'.format(e))
            # clean up
            try:
                sns.delete_topic(TopicArn=trigger.snsTopic)
            except ClientError as deleteError:
                pass
            db.session.delete(trigger)
            db.session.commit()
            return jsonify(success=False, message='Unable to create IoT rule')

        return jsonify(success=True, trigger=triggerSchema.dump(trigger)) 
    else:
        triggerSchema = TriggerSchema(many=True)
        return jsonify(success=True, triggers=triggerSchema.dump(Trigger.query.filter_by(userID=current_user.id).all()))

@app.route('/triggers/<int:triggerID>', methods=['GET', 'DELETE'])
@login_required
def getOrDeleteTrigger(triggerID):
    trigger = Trigger.query.filter(Trigger.id == triggerID, Trigger.userID == current_user.id).one_or_none()
    if trigger is None:
        return jsonify(success=False, message='A trigger with that ID does not exist!')

    if request.method == 'DELETE':
        if trigger.iotRuleName:
            # delete IoT rule
            iot = boto3.client('iot')

            try:
                iot.delete_topic_rule(ruleName=trigger.iotRuleName)
            except ClientError as e:
                logger.debug('Error deleting IoT rule: {}'.format(e))
                return jsonify(success=False, message='Unable to delete IoT rule')

            trigger.iotRuleName = None
            db.session.commit()

        # delete SNS topic 
        sns = boto3.client('sns')
    
        try:
            sns.delete_topic(TopicArn=trigger.snsTopic)
        except ClientError as e:
            logger.debug('Error deleting SNS topic: {}'.format(e))
            return jsonify(success=False, message='Unable to delete SNS topic')

        # delete the trigger
        db.session.delete(trigger)
        db.session.commit()
        return jsonify(success=True)
    else:
        triggerSchema = TriggerSchema()
        return jsonify(success=True, trigger=triggerSchema.dump(trigger))
         
@app.route('/triggers/<int:triggerID>/target', methods=['POST'])
@login_required
def createTriggerTarget(triggerID):
    # create trigger target
    trigger = Trigger.query.filter(Trigger.id == triggerID, Trigger.userID == current_user.id).one_or_none()
    if trigger is None:
        return jsonify(success=False, message='A trigger with that ID does not exist!')

    targetSchema = TriggerTargetSchema()
    target, errors = targetSchema.load(request.get_json())
    if errors:
        return jsonify(success=False, error=errors) 

    target.trigger = trigger

    # subscribe to topic
    sns = boto3.client('sns')

    try:
        r = sns.subscribe(TopicArn=trigger.snsTopic, Protocol=target.type, Endpoint=target.address)
    except ClientError as e:
        logger.debug('Error subscribing to topic: {}'.format(e))
        return jsonify(success=False, message='Error subscribing to SNS topic')

    target.snsSubscription = r['SubscriptionArn']

    db.session.add(target)
    db.session.commit()

    return jsonify(success=True, target=targetSchema.dump(target))

@app.route('/targets/<int:targetID>', methods=['DELETE'])
@login_required
def deleteTriggerTarget(targetID):
    # delete trigger target
    target = TriggerTarget.query.filter(TriggerTarget.id == targetID, TriggerTarget.trigger.has(userID=current_user.id)).one_or_none()

    if target is None:
        return jsonify(success=False, message='A target with that ID does not exist!')

    # unsubscribe from topic
    sns = boto3.client('sns')
    
    try:
        sns.unsubscribe(SubscriptionArn=target.snsSubscription)
    except ClientError as e:
        logger.debug('Error unsubscribing from topic: {}'.format(e))
        return jsonify(success=False, message='Error unsubscribing from SNS topic')

    db.session.delete(target)
    db.session.commit()

    return jsonify(success=True)
     
