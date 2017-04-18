from base import db, ma
from marshmallow_sqlalchemy import field_for

class TriggerTarget(db.Model):
    __tablename__ = 'triggertargets'

    id = db.Column(db.Integer, primary_key=True)
    triggerID = db.Column(db.Integer, db.ForeignKey('triggers.id'))
    type = db.Column(db.Enum('email', 'sms'))
    address = db.Column(db.String(length=100))
    snsSubscription = db.Column(db.String(length=200))

class TriggerTargetSchema(ma.ModelSchema):
    class Meta:
        model = TriggerTarget

    id = field_for(TriggerTarget, 'id', dump_only=True) 
    snsSubscription = field_for(TriggerTarget, 'snsSubscription', dump_only=True)
