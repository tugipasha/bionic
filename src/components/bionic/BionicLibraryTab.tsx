import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, Trash2, ExternalLink, FileText, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { convertToBionicHtml, calculateTextStats } from "./bionic-transformer";
import { fetchLibraryDocs, deleteLibraryDoc, type LibraryDocument } from "@/lib/supabase-db";

interface BionicLibraryTabProps {
  onSelectDocument: (text: string) => void;
}

export function BionicLibraryTab({ onSelectDocument }: BionicLibraryTabProps) {
  const [docs, setDocs] = useState<LibraryDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LibraryDocument | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await fetchLibraryDocs();
      setDocs(saved);
      if (saved.length > 0 && !selectedDoc) {
        setSelectedDoc(saved[0] ?? null);
      }
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDoc]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteLibraryDoc(id);
      const updated = docs.filter((d) => d.id !== id);
      setDocs(updated);
      if (selectedDoc?.id === id) {
        setSelectedDoc(updated[0] || null);
      }
      toast.success("Belge kütüphaneden silindi.");
    } catch {
      toast.error("Silinemedi.");
    }
  };

  const handleCopy = async (doc: LibraryDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const bionicHtml = convertToBionicHtml(doc.text);
      const blobHtml = new Blob([bionicHtml], { type: "text/html" });
      const blobText = new Blob([doc.text], { type: "text/plain" });
      const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
      await navigator.clipboard.write(data);
      setCopiedId(doc.id);
      toast.success("Biyonik metin panoya kopyalandı!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      await navigator.clipboard.writeText(doc.text);
      setCopiedId(doc.id);
      toast.success("Metin kopyalandı!");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden pb-4">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-foreground/15 bg-foreground/10 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-foreground/90" />
          <h2 className="font-display text-base font-medium text-foreground">
            Biyonik Metin Kütüphanem ({docs.length})
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLibrary}
            className="flex items-center gap-1 rounded-lg p-1.5 text-xs text-foreground/70 hover:bg-foreground/10 hover:text-foreground transition-colors"
            title="Yenile"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Yenile</span>
          </button>
          <span className="text-xs text-foreground/70 hidden sm:inline">
            Supabase Veritabanı ile senkronize
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-4 min-h-[440px]">
        {/* Document List */}
        <div className="flex flex-col rounded-3xl border border-foreground/20 bg-foreground/10 p-4 backdrop-blur-md overflow-y-auto">
          {docs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-foreground/50">
              <FileText className="mb-3 size-10 opacity-40" />
              <p className="text-sm font-medium">Henüz kayıtlı belgeniz yok.</p>
              <p className="mt-1 text-xs text-foreground/40">
                Çeviri veya okuyucu sekmesinden metinlerinizi "Kaydet" butonu ile buraya
                ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`group relative flex cursor-pointer flex-col rounded-2xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-foreground/40 bg-foreground/20 shadow-md"
                        : "border-foreground/10 bg-foreground/5 hover:border-foreground/20 hover:bg-foreground/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-display text-sm font-medium text-foreground">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(doc, e)}
                          title="Kopyala"
                          className="rounded-lg p-1 text-foreground/70 hover:bg-foreground/20 hover:text-foreground"
                        >
                          {copiedId === doc.id ? (
                            <Check className="size-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(doc.id, e)}
                          title="Sil"
                          className="rounded-lg p-1 text-foreground/70 hover:bg-destructive/20 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-foreground/60">{doc.text}</p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-foreground/50">
                      <span>
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString("tr-TR")
                          : "Bugün"}
                      </span>
                      <span>{doc.words || calculateTextStats(doc.text).words} kelime</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Document Preview */}
        <div className="flex flex-col md:col-span-2 rounded-3xl border border-foreground/25 bg-foreground/15 p-6 backdrop-blur-md shadow-2xl">
          {selectedDoc ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 pb-4">
                <div>
                  <h3 className="font-display text-xl font-medium text-foreground">
                    {selectedDoc.title}
                  </h3>
                  <p className="text-xs text-foreground/60">
                    {calculateTextStats(selectedDoc.text).words} kelime ·{" "}
                    {selectedDoc.createdAt
                      ? new Date(selectedDoc.createdAt).toLocaleString("tr-TR")
                      : "Kayıtlı Belge"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDocument(selectedDoc.text);
                      toast.info("Belge çeviriciye yüklendi.");
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-foreground/30 bg-foreground text-background px-4 py-1.5 text-xs font-medium transition-all hover:bg-foreground/90"
                  >
                    <ExternalLink className="size-3.5" />
                    Çeviricide Düzenle
                  </button>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto rounded-2xl border border-foreground/10 bg-black/25 p-5 text-base leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{
                  __html: convertToBionicHtml(selectedDoc.text),
                }}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-foreground/40">
              <BookOpen className="mb-2 size-10 opacity-30" />
              <p className="text-sm">Görüntülemek için sol listeden bir belge seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
