from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_login import LoginManager
from flask.ext.bcrypt import Bcrypt
import boto3

app = Flask(__name__)
app.config.from_envvar('CONFIG_FILE')
db = SQLAlchemy(app)
ma = Marshmallow(app)
bcrypt = Bcrypt(app)
loginManager = LoginManager()
loginManager.init_app(app)
cognito = boto3.client('cognito-identity')
