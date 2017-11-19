import os

from flask import Flask, send_from_directory

app = Flask(__name__, static_url_path='')


@app.route('/')
def index():
    return open('index.html').read()


@app.route('/<path>')
def send_js(path):
    return send_from_directory(os.getcwd(), path)
