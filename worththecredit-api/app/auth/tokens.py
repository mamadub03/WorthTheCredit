"""Auth0 access-token (JWT) validation. No database access here.

1. Read the `kid` (key id) from the JWT header.
2. Get Auth0's public signing keys from https://<AUTH0_DOMAIN>/.well-known/jwks.json
   (cached for an hour) and pick the key with that `kid`.
3. Verify the RS256 signature with that public key, then the claims:
   `iss` == https://<AUTH0_DOMAIN>/, `aud` contains AUTH0_AUDIENCE, `exp` in the future.
4. Read `sub` (user id) and our namespaced custom claims (email, email_verified).
"""

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient

from app.config import Settings, get_settings


@dataclass(frozen=True)
class TokenClaims:
    sub: str  # "auth0|65f1c0..."
    email: str | None
    email_verified: bool  # False if the custom claim is missing


class TokenError(Exception):
    """Missing/malformed/expired token, wrong audience/issuer, bad signature → 401."""


class AuthUnavailable(Exception):
    """Couldn't download Auth0's keys (our problem, not the user's) → 503."""


class TokenVerifier:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.jwks_client = PyJWKClient(
            f"https://{settings.auth0_domain}/.well-known/jwks.json",
            cache_keys=True,
            lifespan=3600,
            timeout=10,
        )

    def _signing_key(self, token: str) -> Any:
        try:
            return self.jwks_client.get_signing_key_from_jwt(token).key
        except jwt.PyJWKClientConnectionError as exc:
            raise AuthUnavailable(str(exc)) from exc
        except (jwt.PyJWKClientError, jwt.DecodeError) as exc:
            raise TokenError(f"no matching signing key: {exc}") from exc

    def verify(self, token: str) -> TokenClaims:
        key = self._signing_key(token)
        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],  # never accept "none" or HS256
                audience=self.settings.auth0_audience,
                issuer=self.settings.auth0_issuer,
                leeway=30,  # seconds of clock-skew tolerance
                options={"require": ["exp", "iat", "sub", "aud", "iss"]},
            )
        except jwt.InvalidTokenError as exc:  # includes ExpiredSignatureError, InvalidAudienceError, ...
            raise TokenError(str(exc)) from exc
        ns = self.settings.auth0_claim_namespace
        email = claims.get(f"{ns}email")
        return TokenClaims(
            sub=str(claims["sub"]),
            email=email if isinstance(email, str) else None,
            # Strict: only an explicit `true` counts. Missing → not verified.
            email_verified=claims.get(f"{ns}email_verified") is True,
        )


@lru_cache
def _verifier(domain: str, audience: str) -> TokenVerifier:
    return TokenVerifier(get_settings())


def get_token_verifier() -> TokenVerifier:
    """FastAPI dependency; tests override it with a verifier that knows the test key."""
    s = get_settings()
    return _verifier(s.auth0_domain, s.auth0_audience)
