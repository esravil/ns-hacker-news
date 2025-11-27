import type { Comment, CommentNode } from "./threadTypes";

export const MAX_NESTING_DEPTH = 6;

export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodesById = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodesById.set(comment.id, { ...comment, children: [] });
  }

  for (const node of nodesById.values()) {
    if (node.parent_id && nodesById.has(node.parent_id)) {
      const parent = nodesById.get(node.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // Show freshest top-level comments at the top of the page.
  // (Replies remain ordered by their insertion order within each parent.)
  roots.sort((a, b) => {
    if (a.created_at === b.created_at) return 0;
    return a.created_at < b.created_at ? 1 : -1;
  });

  return roots;
}