// Shape of a holotape metadata.json.
// Mirrors metadata.schema.json, which is what actually validates
export interface Metadata {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  icon: string;
  previews?: string[];
  type?: string;
  readme: string;
  tags?: string;
  previousId?: string;
  storage: StorageEntry[];
  storageOptional?: StorageEntry[];
}

// A metadata.json exactly as it comes off disk. It is hand-written and may not
// have been validated yet, so every field has to be treated as possibly
// missing. Use Metadata for values already known to be well formed.
export type RawMetadata = Partial<Metadata>;

export interface StorageEntry {
  /** On-device destination path (e.g. HOLO/MYAPP/APP.JS). */
  pipboy: string;
  /** Repo source path (e.g. storage/APP.ts). */
  source: string;
  label?: string;
  sizeKB?: number;
  previewMp3?: string;
  previewMp4?: string;
}

export interface HolotapeCheck {
  id: string | undefined;
  missing: string[];
  source: string;
}
