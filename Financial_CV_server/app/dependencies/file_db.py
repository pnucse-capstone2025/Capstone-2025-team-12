from sqlmodel import Session, create_engine, SQLModel
import os
from dotenv import load_dotenv

load_dotenv()

file_db_url = 'sqlite:///file.db'

db_conn_args = {'check_same_thread': False}

file_db_engine = create_engine(file_db_url, connect_args=db_conn_args)

def get_files_session():
    with Session(file_db_engine) as session:
        yield session

def create_file_db():
    SQLModel.metadata.create_all(file_db_engine)
    