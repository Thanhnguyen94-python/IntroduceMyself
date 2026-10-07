"use client";

type Props = {
  bucket: "images" | "videos" | "docs";
  setBucket: (value: "images" | "videos" | "docs") => void;
  folder: string;
  setFolder: (value: string) => void;
  onPickFile: (file: File) => void;
  uploading: boolean;
  mediaUrl: string;
};

export function MediaTab({ bucket, setBucket, folder, setFolder, onPickFile, uploading, mediaUrl }: Props) {
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Kho Media Storage</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={bucket}
          onChange={(e) => setBucket(e.target.value as "images" | "videos" | "docs")}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <option value="images">images</option>
          <option value="videos">videos</option>
          <option value="docs">docs</option>
        </select>
        <input
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="Folder (vd: projects, showcase, journey)"
          className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        />
        <div className="md:col-span-3">
          <label className="inline-flex cursor-pointer rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white">
            Upload
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickFile(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {mediaUrl && (
        <div className="space-y-2">
          <input readOnly value={mediaUrl} className="w-full rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
          <button onClick={() => navigator.clipboard.writeText(mediaUrl)} className="rounded bg-slate-700 px-3 py-2 text-xs font-semibold text-white">Copy URL</button>
        </div>
      )}
    </section>
  );
}
