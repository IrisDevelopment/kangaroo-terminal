from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True) # "BHP"
    name = Column(String)                            # "BHP Group"
    sector = Column(String, nullable=True)
    
    # Real-time data fields
    price = Column(Float, default=0.0)
    change_amount = Column(Float, default=0.0)
    change_percent = Column(String, default="0%")    # keeping this as a string for now ("-1.5%")
    market_cap = Column(String, nullable=True)       # "200B"
    volume = Column(String, nullable=True)
    
    last_updated = Column(DateTime, default=datetime.utcnow)

    # historical prices will be tracked later in a seperate table