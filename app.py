import os
from flask import Flask, request, redirect, url_for, render_template, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1 MB upload limit
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'user-assets')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Simple in-memory user store
USERS = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        file = request.files.get('profile_pic')

        if not username or not password or not file:
            return render_template('register.html', error='Alle Felder sind erforderlich.')
        if not allowed_file(file.filename):
            return render_template('register.html', error='Nur JPEG und PNG sind erlaubt.')
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()

        user_id = str(len(USERS) + 1)
        user_dir = os.path.join(app.config['UPLOAD_FOLDER'], user_id)
        os.makedirs(user_dir, exist_ok=True)
        image_path = os.path.join(user_dir, 'profile.jpg')

        try:
            img = Image.open(file.stream)
            img = img.convert('RGB')
            img.thumbnail((512, 512))
            img.save(image_path, format='JPEG')
        except Exception:
            return render_template('register.html', error='Fehler beim Verarbeiten des Bildes.')

        USERS[user_id] = {'username': username, 'password': password}
        return redirect(url_for('profile', user_id=user_id))

    return render_template('register.html')


@app.route('/profile/<user_id>')
def profile(user_id):
    user = USERS.get(user_id)
    if not user:
        return 'Unbekannter Nutzer', 404
    return render_template('profile.html', user=user, user_id=user_id)


@app.route('/user-assets/<user_id>/profile.jpg')
def profile_pic(user_id):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], user_id), 'profile.jpg')


if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
