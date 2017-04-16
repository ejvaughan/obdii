from base import db

class Thing(db.Model):
    __tablename__ = 'things'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(length=100), unique=True)
    userID = db.Column(db.Integer, db.ForeignKey('users.id'))

    def __init__(self, name):
        self.name = name

    @staticmethod
    def fullyQualifiedName(thingName):
        return 'arn:aws:iot:us-east-1:845043522277:thing/' + thingName
