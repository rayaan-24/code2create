"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { adminApi } from '@/lib/api/admin';

export default function KnowledgeList() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listDocuments();
      if (res.data) setDocs(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div>Loading documents...</div>;

  return (
    <div className="space-y-3">
      {docs.length === 0 ? (
        <GlassCard className="p-4">No documents found.</GlassCard>
      ) : (
        docs.map((d) => (
          <GlassCard key={d.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-bold">{d.title}</div>
              <div className="text-xs text-gray-500">{d.file_name} • {d.academic_year || '—'}</div>
              <div className="text-xs text-gray-400">Status: {d.ingestion_status || 'UNKNOWN'}</div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton size="sm" onClick={() => window.alert(JSON.stringify(d, null, 2))}>View</GlassButton>
              <GlassButton size="sm" variant="secondary" onClick={async () => { await adminApi.reindexDocument(d.id); load(); }}>Re-index</GlassButton>
              <GlassButton size="sm" variant="ghost" onClick={async () => { const r = await adminApi.getDocument(d.id); if (r.data) { setDocs((s) => s.map(x => x.id === d.id ? r.data : x)); }}}>Refresh</GlassButton>
              <GlassButton size="sm" variant="danger" onClick={async () => { if (confirm('Delete this document?')) { await adminApi.deleteDocument(d.id); load(); }}}>Delete</GlassButton>
            </div>
          </GlassCard>
        ))
      )}
    </div>
  );
}
