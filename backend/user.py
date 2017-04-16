from base import db, bcrypt
from flask_login import UserMixin

class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    cognitoID = db.Column(db.String(length=100), nullable=False)
    email = db.Column(db.String(length=100), unique=True, nullable=False)
    password = db.Column(db.String(length=100), nullable=False)
    things = db.relationship('Thing', backref='user')

    def __init__(self, email, password):
        self.email = email
        self.password = bcrypt.generate_password_hash(password)

    def checkPassword(self, value):
        return bcrypt.check_password_hash(self.password, value)

