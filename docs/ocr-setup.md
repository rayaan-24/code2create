## OCR Setup for Nexora Backend

This project adds optional OCR fallback support (pdf2image + pytesseract + Pillow) used when PDF files contain scanned images instead of extractable text.

What I changed
- `backend/Dockerfile`: now installs `poppler-utils` and `tesseract-ocr`, plus minimal image libs required by Pillow (`libjpeg62-turbo-dev`, `zlib1g-dev`, `libtiff5-dev`, `libopenjp2-7-dev`).

How to rebuild the backend image

Run (from repo root):

```bash
# build backend image
docker build -t nexora-backend:ocr-enabled -f backend/Dockerfile backend

# or with docker-compose
docker-compose up --build backend
```

Verify OCR availability

1. Start the backend service.
2. Exec into the container and run:

```bash
# inside container
tesseract --version
pdftotext -v
```

If both commands return versions, OCR support is available.

Notes
- Tesseract language packs can be installed if you need specific languages (e.g., `tesseract-ocr-eng`, `tesseract-ocr-spa`). On Debian-based images, install the corresponding packages.
- The Python packages `pdf2image`, `pytesseract`, and `Pillow` are already included in `backend/requirements.txt`. After rebuilding the image, ensure you reinstall Python dependencies.
- OCR availability is gated by the ingestion code; if system binaries are missing, OCR fallback is skipped automatically.
