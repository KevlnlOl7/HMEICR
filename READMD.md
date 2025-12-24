# set env file
```bash
python -m pip install cryptography
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
將其存入專案資料夾中的.env檔
```.env
EINVOICE_SECRET_KEY=q9s8D0Lx7pYzJwNn...
```
