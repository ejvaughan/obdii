from base import db, ma
from trigger_target import TriggerTarget

class Trigger(db.Model):
    __tablename__ = 'triggers'

    id = db.Column(db.Integer, primary_key=True)
    userID = db.Column(db.Integer, db.ForeignKey('users.id'))
    thingID = db.Column(db.Integer, db.ForeignKey('things.id'))
    property = db.Column(db.String(length=20))
    comparator = db.Column(db.Enum('lt', 'gt', 'eq'))
    value = db.Column(db.Float)
    message = db.Column(db.String(length=200))
    iotRuleName = db.Column(db.String(length=200))
    snsTopic = db.Column(db.String(length=200)) 

    targets = db.relationship('TriggerTarget', backref='trigger', cascade='all, delete, delete-orphan')

#    def __init__(self, property, comparator, value, message, iotRuleName, snsTopic):
#        self.property = property
#        self.comparator = comparator
#        self.value = value
#        self.message = message
#        self.iotRuleName = iotRuleName
#        self.snsTopic = snsTopic

class TriggerSchema(ma.ModelSchema):
    class Meta:
        model = Trigger
