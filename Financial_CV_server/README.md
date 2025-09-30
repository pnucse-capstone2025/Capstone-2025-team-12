<<환경구성>>

python -m venv .venv
or py -m venv .venv

.venv\bin\Scripts\activate
or .venv\bin\Scripts\activate

pip3 install "fastapi[standard]"

pip3 install sqlmodel

pip3 install python-dotenv

pip3 install pydantic

pip3 install passlib

pip install "passlib[bcrypt]"

pip install "python-jose[cryptography]"

pip install redis

실행 : fastapi dev main.py

DB설치 : pip3 install sqlmodel

<<RedisDatabase>>

wsl 설치 -> ubuntu22.04 설치

sudo apt update

sudo apt install redis -y

//Redis 실행  
redis-cli


<<Melotts>>

git clone https://github.com/myshell-ai/MeloTTS.git

cd MeloTTS

pip install -e .

python -m unidic download

<<CHAT API KEY 설정>>

