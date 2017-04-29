from base import db, ma
from trigger import TriggerSchema
from marshmallow import fields
from marshmallow_sqlalchemy import field_for

class Thing(db.Model):
    __tablename__ = 'things'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(length=100), unique=True)
    userID = db.Column(db.Integer, db.ForeignKey('users.id'))
    triggers = db.relationship('Trigger', backref='thing', cascade='all, delete, delete-orphan')

    def __init__(self, name):
        self.name = name

    @staticmethod
    def fullyQualifiedName(thingName):
        return 'arn:aws:iot:us-east-1:845043522277:thing/' + thingName

class ThingSchema(ma.ModelSchema):
    class Meta:
        model = Thing 
        
    user = field_for(Thing, 'user', load_only=True)
    triggers = fields.Nested(TriggerSchema, many=True, exclude=('thingID', ))
