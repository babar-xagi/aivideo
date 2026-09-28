from functools import lru_cache
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import get_settings


class StorageUnavailable(Exception):
    """Object storage is not configured or could not complete a request."""


class StorageService:
    def __init__(
        self,
        endpoint_url: str,
        region: str,
        bucket: str,
        access_key_id: str,
        secret_access_key: str,
    ) -> None:
        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            region_name=region,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def presign_upload(self, key: str, content_type: str) -> str:
        try:
            return self.client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=300,
                HttpMethod="PUT",
            )
        except (BotoCoreError, ClientError) as exc:
            raise StorageUnavailable from exc

    def head_object(self, key: str) -> dict[str, Any] | None:
        try:
            return self.client.head_object(Bucket=self.bucket, Key=key)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {
                "404",
                "NoSuchKey",
                "NotFound",
            }:
                return None
            raise StorageUnavailable from exc
        except BotoCoreError as exc:
            raise StorageUnavailable from exc

    def presign_download(self, key: str) -> str:
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=300,
                HttpMethod="GET",
            )
        except (BotoCoreError, ClientError) as exc:
            raise StorageUnavailable from exc

    def delete_object(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except (BotoCoreError, ClientError) as exc:
            raise StorageUnavailable from exc

    def download_object(self, key: str, path: Path) -> None:
        try:
            self.client.download_file(self.bucket, key, str(path))
        except (BotoCoreError, ClientError, OSError) as exc:
            raise StorageUnavailable from exc


@lru_cache
def get_storage_service() -> StorageService:
    settings = get_settings()
    if not all(
        (
            settings.s3_endpoint_url,
            settings.s3_bucket,
            settings.s3_access_key_id,
            settings.s3_secret_access_key,
        )
    ):
        raise StorageUnavailable("Object storage is not configured")
    return StorageService(
        endpoint_url=settings.s3_endpoint_url or "",
        region=settings.s3_region,
        bucket=settings.s3_bucket or "",
        access_key_id=settings.s3_access_key_id or "",
        secret_access_key=settings.s3_secret_access_key or "",
    )
