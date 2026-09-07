import hashlib
import os
import re
from pathlib import Path
from typing import Tuple
from app.core.config import settings


class DocumentStorageService:
    """Service handling local filesystem storage for original uploaded documents."""

    def __init__(self, base_dir: str = None):
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            self.base_dir = Path(settings.UPLOAD_DIR)
        
        # Ensure base directory exists
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent directory traversal and invalid characters."""
        clean_name = os.path.basename(filename)
        # Keep alphanumeric, dashes, underscores, and dots
        clean_name = re.sub(r"[^a-zA-Z0-9._-]", "_", clean_name)
        return clean_name or "document"

    def compute_sha256(self, content: bytes) -> str:
        """Compute the SHA-256 hash of byte content."""
        return hashlib.sha256(content).hexdigest()

    def save_file(
        self, community_id: str, document_id: str, file_name: str, file_bytes: bytes
    ) -> Tuple[str, str]:
        """
        Saves original document bytes to disk partitioned by community.
        Returns:
            (storage_key, sha256_checksum)
        """
        clean_name = self._sanitize_filename(file_name)
        community_dir = self.base_dir / str(community_id)
        community_dir.mkdir(parents=True, exist_ok=True)

        target_file_name = f"{document_id}_{clean_name}"
        file_path = community_dir / target_file_name

        file_path.write_bytes(file_bytes)

        # Storage key is relative to base_dir with forward slashes for portability
        storage_key = f"{community_id}/{target_file_name}"
        checksum = self.compute_sha256(file_bytes)
        return storage_key, checksum

    def get_file(self, storage_key: str) -> bytes:
        """Retrieve stored file contents."""
        file_path = self.base_dir / storage_key
        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"Stored file not found for key: {storage_key}")
        return file_path.read_bytes()

    def delete_file(self, storage_key: str) -> bool:
        """Delete stored file from disk."""
        file_path = self.base_dir / storage_key
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return True
        return False

    def exists(self, storage_key: str) -> bool:
        """Check if file exists on disk."""
        file_path = self.base_dir / storage_key
        return file_path.exists() and file_path.is_file()


# Default singleton instance
storage_service = DocumentStorageService()
