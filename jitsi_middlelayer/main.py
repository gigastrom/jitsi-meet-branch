#!/usr/bin/env python3
"""
Empty FastAPI template for Jitsi Switch integration
"""
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from fastapi import FastAPI, Header, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import JWT_SECRET_KEY
from database import get_db
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Initialize FastAPI app
app = FastAPI(
    title="API Template",
    description="An empty template for FastAPI",
    version="1.0.0",
)

API_KEY_HEADER = APIKeyHeader(name="Authorization")



class TokenPayload(BaseModel):
    id: int
    active: bool
    is_bot: bool
    iat: int
    exp: int


async def get_current_user_from_token(
    token: str = Security(API_KEY_HEADER), db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token.replace("Bearer ", ""), JWT_SECRET_KEY, algorithms=["HS256"])
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        return TokenPayload(**payload)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "API template is running"}

# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
