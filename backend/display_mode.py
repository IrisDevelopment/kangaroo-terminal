import uuid
import time
from datetime import datetime, timezone
from sqlalchemy.orm import Session # type: ignore
from database import SessionLocal
import models

# session ttl 24h
SESSION_TTL = 86400

# { session_id: { "created": timestamp, "last_active": timestamp } }
_sessions: dict[str, dict] = {}

def get_or_create_session(session_id: str | None) -> str:
    """
    returns an existing session id or creates a new one
    cleans up expired sessions 
    """
    now = time.time()

    # cleanup 
    expired = [sid for sid, meta in _sessions.items() if now - meta["created"] > SESSION_TTL]
    for sid in expired:
        _cleanup_session_data(sid)
        del _sessions[sid]

    # validate 
    if session_id and session_id in _sessions:
        _sessions[session_id]["last_active"] = now
        return session_id

    # create 
    new_id = uuid.uuid4().hex[:16]
    _sessions[new_id] = {"created": now, "last_active": now}

    _seed_session(new_id)
    return new_id


def _seed_session(session_id: str):
    """creates default account & empty portfolio for a new session"""
    db = SessionLocal()
    try:
        account = models.SessionAccount(session_id=session_id, balance=100000.0)
        db.add(account)
        db.commit()
    finally:
        db.close()


def _cleanup_session_data(session_id: str):
    """removes all DB rows for an expired session"""
    db = SessionLocal()
    try:
        db.query(models.SessionHolding).filter_by(session_id=session_id).delete()
        db.query(models.SessionTransaction).filter_by(session_id=session_id).delete()
        db.query(models.SessionPendingOrder).filter_by(session_id=session_id).delete()
        db.query(models.SessionAlert).filter_by(session_id=session_id).delete()
        db.query(models.SessionAccount).filter_by(session_id=session_id).delete()
        db.query(models.SessionWatchlist).filter_by(session_id=session_id).delete()
        db.commit()
    except Exception as e:
        print(f"[display] cleanup failed for {session_id}: {e}")
        db.rollback()
    finally:
        db.close()


def session_execute_trade(db: Session, session_id: str, ticker: str, shares: int, price: float, trade_type: str):
    account = db.query(models.SessionAccount).filter_by(session_id=session_id).first()
    if not account:
        account = models.SessionAccount(session_id=session_id, balance=100000.0)
        db.add(account)

    total_cost = shares * price

    if trade_type == "BUY":
        if account.balance < total_cost:
            raise ValueError(f"Insufficient Buying Power. Cost: ${total_cost}, Available: ${account.balance}")

        account.balance -= total_cost

        holding = db.query(models.SessionHolding).filter_by(
            session_id=session_id, ticker=ticker
        ).first()
        if holding:
            current_total = holding.shares * holding.avg_cost
            new_total = current_total + total_cost
            total_shares = holding.shares + shares
            holding.shares = total_shares
            holding.avg_cost = new_total / total_shares
        else:
            db.add(models.SessionHolding(
                session_id=session_id, ticker=ticker,
                shares=shares, avg_cost=price
            ))

    elif trade_type == "SELL":
        holding = db.query(models.SessionHolding).filter_by(
            session_id=session_id, ticker=ticker
        ).first()
        if not holding or holding.shares < shares:
            raise ValueError("Insufficient Shares")

        account.balance += total_cost
        holding.shares -= shares
        if holding.shares == 0:
            db.delete(holding)

    # record tx
    db.add(models.SessionTransaction(
        session_id=session_id, ticker=ticker,
        type=trade_type, shares=shares, price=price
    ))
