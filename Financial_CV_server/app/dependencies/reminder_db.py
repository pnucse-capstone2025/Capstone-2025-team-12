from sqlmodel import Session, create_engine, SQLModel
import os
from dotenv import load_dotenv

load_dotenv()

reminder_db_url = 'sqlite:///reminders.db'
db_conn_args = {'check_same_thread': False}
reminder_db_engine = create_engine(reminder_db_url, connect_args=db_conn_args)

def get_reminder_session():
    with Session(reminder_db_engine) as session:
        yield session

def create_reminder_db():
    SQLModel.metadata.create_all(reminder_db_engine) 