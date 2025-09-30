from sqlmodel import Session, create_engine, SQLModel
import os
from dotenv import load_dotenv

load_dotenv()

document_db_url = 'sqlite:///documents.db'
db_conn_args = {'check_same_thread': False}
document_db_engine = create_engine(document_db_url, connect_args=db_conn_args)

def get_document_session():
    with Session(document_db_engine) as session:
        yield session

def create_document_db():
    SQLModel.metadata.create_all(document_db_engine)