// Shape of a holotape metadata.json.
// Mirrors metadata.schema.json, which is what actually validates
export type Metadata = {
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
  customFirmwareFiles?: StorageEntry[];
};

export type StorageEntry = {
  name: string;
  url: string;
  label?: string;
  sizeKB?: number;
  previewMp3?: string;
  previewMp4?: string;
};
