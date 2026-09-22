from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_hash_password_and_verify_success():
    hashed = hash_password("mypassword123")
    assert hashed != "mypassword123"
    assert verify_password("mypassword123", hashed) is True


def test_verify_password_fails_for_wrong_password():
    hashed = hash_password("mypassword123")
    assert verify_password("wrongpassword", hashed) is False


def test_create_and_decode_access_token_roundtrip():
    token = create_access_token(subject="user-123")
    subject = decode_access_token(token)
    assert subject == "user-123"


def test_decode_access_token_rejects_garbage_token():
    assert decode_access_token("not-a-real-token") is None
