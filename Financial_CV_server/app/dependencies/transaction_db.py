from sqlmodel import Session, create_engine, SQLModel
import os
from dotenv import load_dotenv

load_dotenv()

transaction_db_url = 'sqlite:///transaction.db'
db_conn_args = {'check_same_thread': False}
transaction_db_engine = create_engine(transaction_db_url, connect_args=db_conn_args)

def get_transaction_session():
    with Session(transaction_db_engine) as session:
        yield session

def create_transaction_db():
    SQLModel.metadata.create_all(transaction_db_engine) 