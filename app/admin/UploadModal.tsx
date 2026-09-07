"use client";

import React, { useState } from "react";
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { adminApi } from '@/lib/api/admin';

export default function UploadModal({ visible, onClose, onUploaded }: any) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const results: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const res = await adminApi.uploadDocument(f, { title, description });
      if (res.data) {
        results.push(res.data);
        // start optimistic entry for UI
        setUploadedDocs((s) => [...s, { id: res.data.document_id, title: res.data.title || f.name, ingestion_status: res.data.ingestion_status || 'PROCESSING' }]);
        // begin polling for status in background (don't await)
        pollStatus(res.data.document_id);
      } else {
        // show failure entry
        setUploadedDocs((s) => [...s, { id: null, title: f.name, ingestion_status: 'FAILED', error: res.error }]);
      }
    }

    setUploading(false);
    onUploaded && onUploaded();
  };

  const pollStatus = async (documentId: string) => {
    const start = Date.now();
    const timeoutMs = 1000 * 60 * 5; // 5 minutes
    const intervalMs = 2000;
    const check = async () => {
      try {
        const r = await adminApi.getDocument(documentId);
        if (r.data) {
          setUploadedDocs((s) => s.map((x) => (x.id === documentId ? { ...x, ingestion_status: r.data.ingestion_status, _raw: r.data } : x)));
          if (r.data.ingestion_status === 'READY' || r.data.ingestion_status === 'FAILED') return;
        }
      } catch (e) {
        // ignore and continue
      }
      if (Date.now() - start < timeoutMs) {
        setTimeout(check, intervalMs);
      } else {
        setUploadedDocs((s) => s.map((x) => (x.id === documentId ? { ...x, ingestion_status: 'TIMEOUT' } : x)));
      }
    };
    check();
  };

  return (
    <GlassModal isOpen={visible} onClose={onClose} title="Upload University Material">
      <div className="space-y-3">
        <div>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
        </div>
        <div>
          <GlassInput placeholder="Title" value={title} onChange={(e: any) => setTitle(e.target.value)} />
        </div>
        <div>
          <GlassInput placeholder="Description" value={description} onChange={(e: any) => setDescription(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <GlassButton variant="primary" onClick={handleUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload & Process'}</GlassButton>
          <GlassButton variant="secondary" onClick={onClose}>Cancel</GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}
