from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.contact import router as contact_router
from app.api.routes.geo import router as geo_router
from app.api.routes.me import router as me_router

app = FastAPI(title="Lead Generator API")

# Dev-friendly default (Next.js on localhost:3000); tighten for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(geo_router)
app.include_router(me_router)
app.include_router(contact_router)
