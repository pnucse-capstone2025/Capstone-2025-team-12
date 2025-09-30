from sqlmodel import Session, create_engine, SQLModel
import os
from dotenv import load_dotenv

load_dotenv()

account_db_url = 'sqlite:///accounts.db'
db_conn_args = {'check_same_thread': False}
account_db_engine = create_engine(account_db_url, connect_args=db_conn_args)

def get_account_session():
    with Session(account_db_engine) as session:
        yield session

def create_account_db():
    SQLModel.metadata.create_all(account_db_engine) 