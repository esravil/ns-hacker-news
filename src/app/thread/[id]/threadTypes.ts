export type Thread = {
  id: number;
  title: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author_display_name: string | null;
  url: string | null;
  url_domain: string | null;
  media_url: string | null;
  media_mime_type: string | null;
};

export type Comment = {
  id: number;
  body: string;
  created_at: string;
  author_id: string | null;
  parent_id: number | null;
  author_display_name: string | null;
  is_deleted: boolean;
};

export type CommentNode = Comment & {
  children: CommentNode[];
};

export type VoteValue = -1 | 0 | 1;

export type VoteKey = string;