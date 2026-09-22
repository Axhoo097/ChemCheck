"""
Every predictable failure (validation, not found, unauthorized, conflict)
is raised as a ServiceError from a service function. app/main.py catches
it and turns it into the standard error envelope. Route handlers never
build error responses by hand.
"""
from typing import Any


class ServiceError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)
