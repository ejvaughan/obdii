from base import db, ma

class TriggerTarget(db.Model):
    __tablename__ = 'triggertargets'

    id = db.Column(db.Integer, primary_key=True)
    triggerID = db.Column(db.Integer, db.ForeignKey('triggers.id'))
    type = db.Column(db.Enum('email', 'phone'))
    address = db.Column(db.String(length=100))

class TriggerTargetSchema(ma.ModelSchema):
    class Meta:
        model = TriggerTarget
