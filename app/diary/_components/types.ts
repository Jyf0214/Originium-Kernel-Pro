export interface DiaryReference {
  type: string;
  id?: string;
  slug?: string;
  title: string;
}

export interface DiaryEntry {
  id: string;
  title: string;
  content?: string;
  tags: string[];
  date: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  group?: string;
  references?: DiaryReference[];
}
