"""Exercise local S3 signatures, browser CORS, and private object access."""

from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

import httpx

from app.services.storage import get_storage_service


def main() -> None:
    storage = get_storage_service()
    key = f"milestone-5-check/{uuid4()}.webm"
    content = b"synthetic recording bytes"
    signed_put = storage.presign_upload(key, "video/webm")
    try:
        with httpx.Client(timeout=15) as client:
            preflight = client.options(
                signed_put,
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "PUT",
                    "Access-Control-Request-Headers": "content-type",
                },
            )
            assert preflight.status_code in {200, 204}, preflight.status_code
            assert preflight.headers.get("access-control-allow-origin") == (
                "http://localhost:3000"
            )

            upload = client.put(
                signed_put,
                content=content,
                headers={"Content-Type": "video/webm"},
            )
            assert upload.status_code == 200, upload.status_code
            stored = storage.head_object(key)
            assert stored is not None
            assert stored["ContentLength"] == len(content)
            assert stored["ContentType"] == "video/webm"

            signed_get = storage.presign_download(key)
            playback = client.get(signed_get)
            assert playback.status_code == 200, playback.status_code
            assert playback.content == content

            parsed = urlsplit(signed_get)
            unsigned_url = urlunsplit(
                (parsed.scheme, parsed.netloc, parsed.path, "", "")
            )
            unsigned = client.get(unsigned_url)
            assert unsigned.status_code == 403, (
                f"Unsigned read returned {unsigned.status_code}"
            )
    finally:
        storage.delete_object(key)
    print("Signed PUT and GET work; browser CORS allows PUT; unsigned GET is denied.")


if __name__ == "__main__":
    main()
