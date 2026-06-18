import os
import time
from typing import Optional

import httpx
from fastapi import FastAPI, Request, Response, Header, HTTPException
from fastapi.responses import JSONResponse
from jose import jwt, JWTError

PUBLIC_RESOURCE_URL = os.environ.get("PUBLIC_RESOURCE_URL", "").rstrip("/")
AUTH_ISSUER = os.environ.get("AUTH_ISSUER", "").rstrip("/")
AUTH_AUDIENCE = os.environ.get("AUTH_AUDIENCE", PUBLIC_RESOURCE_URL).rstrip("/")
AUTH_CLIENT_ID = os.environ.get("AUTH_CLIENT_ID", "").strip()
REQUIRED_SCOPE = os.environ.get("REQUIRED_SCOPE", "mcp:access").strip()
AUTHORIZED_EMAILS = {
    item.strip().lower()
    for item in os.environ.get("AUTHORIZED_EMAILS", "").split(",")
    if item.strip()
}
AUTHORIZED_SUBS = {
    item.strip()
    for item in os.environ.get("AUTHORIZED_SUBS", "").split(",")
    if item.strip()
}
UPSTREAM_MCP_URL = os.environ.get("UPSTREAM_MCP_URL", "http://127.0.0.1:8787/mcp")

JWKS_CACHE = {"keys": None, "expires_at": 0}

app = FastAPI(title="HH OAuth MCP Gateway")


def issuer_with_slash() -> str:
    return AUTH_ISSUER if AUTH_ISSUER.endswith("/") else AUTH_ISSUER + "/"


def required_scopes() -> set[str]:
    return {s for s in REQUIRED_SCOPE.split() if s}


def require_config():
    missing = []
    if not PUBLIC_RESOURCE_URL:
        missing.append("PUBLIC_RESOURCE_URL")
    if not AUTH_ISSUER:
        missing.append("AUTH_ISSUER")
    if not AUTH_AUDIENCE:
        missing.append("AUTH_AUDIENCE")
    if not REQUIRED_SCOPE:
        missing.append("REQUIRED_SCOPE")
    if missing:
        raise RuntimeError(f"Missing required config: {', '.join(missing)}")


def auth_challenge() -> str:
    require_config()
    return (
        f'Bearer resource_metadata="{PUBLIC_RESOURCE_URL}/.well-known/oauth-protected-resource", '
        f'scope="{REQUIRED_SCOPE}"'
    )


def unauthorized(message: str = "Authentication required") -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"error": message},
        headers={"WWW-Authenticate": auth_challenge()},
    )


@app.get("/healthz")
async def healthz():
    return {
        "ok": True,
        "upstream": UPSTREAM_MCP_URL,
        "auth_issuer": issuer_with_slash(),
        "auth_audience": AUTH_AUDIENCE,
        "required_scope": REQUIRED_SCOPE,
        "auth_client_id_configured": bool(AUTH_CLIENT_ID),
        "authorized_email_count": len(AUTHORIZED_EMAILS),
        "authorized_sub_count": len(AUTHORIZED_SUBS),
        "mode": "auth0_jwt_audience_scope",
    }


@app.get("/.well-known/oauth-protected-resource")
async def oauth_protected_resource():
    require_config()
    return {
        "resource": PUBLIC_RESOURCE_URL,
        "authorization_servers": [AUTH_ISSUER],
        "scopes_supported": sorted(required_scopes()),
        "resource_documentation": f"{PUBLIC_RESOURCE_URL}/docs",
    }


async def get_jwks() -> dict:
    now = time.time()
    if JWKS_CACHE["keys"] and JWKS_CACHE["expires_at"] > now:
        return JWKS_CACHE["keys"]

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{AUTH_ISSUER}/.well-known/jwks.json")
        res.raise_for_status()
        jwks = res.json()

    JWKS_CACHE["keys"] = jwks
    JWKS_CACHE["expires_at"] = now + 3600
    return jwks


async def verify_token(authorization: Optional[str]) -> dict:
    require_config()

    print(
        f"AUTH_DEBUG has_authorization={bool(authorization)} "
        f"starts_bearer={bool(authorization and authorization.lower().startswith('bearer '))}",
        flush=True,
    )

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        jwks = await get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            JWKS_CACHE["keys"] = None
            jwks = await get_jwks()
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Signing key not found")

        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=AUTH_AUDIENCE,
            issuer=issuer_with_slash(),
        )
    except JWTError as exc:
        print(f"AUTH_DEBUG jwt_error={str(exc)}", flush=True)
        raise HTTPException(status_code=401, detail="Invalid bearer token")

    token_scopes = set(str(claims.get("scope", "")).split())
    missing_scopes = required_scopes() - token_scopes
    if missing_scopes:
        raise HTTPException(status_code=403, detail=f"Missing required scope: {' '.join(sorted(missing_scopes))}")

    token_client = str(claims.get("azp") or claims.get("client_id") or "")
    if AUTH_CLIENT_ID and token_client and token_client != AUTH_CLIENT_ID:
        raise HTTPException(status_code=403, detail="Token client not authorized")

    sub = str(claims.get("sub", ""))
    email = str(claims.get("email", "")).lower()

    if AUTHORIZED_SUBS and sub not in AUTHORIZED_SUBS:
        raise HTTPException(status_code=403, detail="Subject not authorized")

    if AUTHORIZED_EMAILS and email and email not in AUTHORIZED_EMAILS:
        raise HTTPException(status_code=403, detail="Email not authorized")

    return claims


@app.api_route("/mcp", methods=["GET", "POST", "OPTIONS"])
async def mcp_proxy(
    request: Request,
    authorization: Optional[str] = Header(default=None),
):
    try:
        await verify_token(authorization)
    except HTTPException as exc:
        print(f"AUTH_DEBUG reject_status={exc.status_code} reject_detail={exc.detail}", flush=True)
        if exc.status_code == 401:
            return unauthorized(exc.detail)
        raise

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {
            "host",
            "authorization",
            "content-length",
            "connection",
        }
    }
    headers.setdefault("accept", "application/json, text/event-stream")

    body = await request.body()

    async with httpx.AsyncClient(timeout=None) as client:
        upstream = await client.request(
            method=request.method,
            url=UPSTREAM_MCP_URL,
            headers=headers,
            content=body,
        )

    excluded = {"content-encoding", "transfer-encoding", "connection"}
    response_headers = {
        key: value for key, value in upstream.headers.items()
        if key.lower() not in excluded
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )
