import type { ReactionEmoji } from "@entities/reaction";
import { createClient } from "@shared/api/supabase/server";

export interface CommentReactionSummary {
  count: number;
  emoji: ReactionEmoji;
  /** True when the viewer has reacted with this emoji on this comment. */
  viewerReacted: boolean;
}

export interface CommentRow {
  author_avatar_url: string | null;
  author_display_name: string | null;
  body: string;
  created_at: string;
  id: string;
  reactions: CommentReactionSummary[];
  updated_at: string;
  user_id: string;
}

export interface CommentThread {
  comment: CommentRow;
  replies: CommentRow[];
}

interface RawComment {
  body: string | null;
  created_at: string | null;
  id: string;
  parent_comment_id: string | null;
  updated_at: string | null;
  user_id: string | null;
}

interface ProfileSlice {
  avatar_url: string | null;
  display_name: string | null;
}

interface ReactionAggEntry {
  count: number;
  viewerReacted: boolean;
}

async function fetchProfileMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, ProfileSlice>> {
  const map = new Map<string, ProfileSlice>();
  if (userIds.length === 0) {
    return map;
  }
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);
  for (const p of data ?? []) {
    map.set(p.id, {
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    });
  }
  return map;
}

function aggregateReactions(
  rows: {
    comment_id: string | null;
    emoji: string | null;
    user_id: string | null;
  }[],
  viewerUserId: string | null
): Map<string, Map<string, ReactionAggEntry>> {
  const out = new Map<string, Map<string, ReactionAggEntry>>();
  for (const r of rows) {
    if (!(r.comment_id && r.emoji)) {
      continue;
    }
    let perComment = out.get(r.comment_id);
    if (!perComment) {
      perComment = new Map();
      out.set(r.comment_id, perComment);
    }
    const entry = perComment.get(r.emoji) ?? { count: 0, viewerReacted: false };
    entry.count += 1;
    if (viewerUserId != null && r.user_id === viewerUserId) {
      entry.viewerReacted = true;
    }
    perComment.set(r.emoji, entry);
  }
  return out;
}

function buildRow(
  c: RawComment,
  profileMap: Map<string, ProfileSlice>,
  reactionMap: Map<string, Map<string, ReactionAggEntry>>
): CommentRow {
  const profile = profileMap.get(c.user_id ?? "") ?? null;
  const perComment = reactionMap.get(c.id) ?? new Map();
  const reactions: CommentReactionSummary[] = [];
  for (const [emoji, agg] of perComment.entries()) {
    reactions.push({
      emoji: emoji as ReactionEmoji,
      count: agg.count,
      viewerReacted: agg.viewerReacted,
    });
  }
  return {
    id: c.id,
    user_id: c.user_id ?? "",
    body: c.body ?? "",
    created_at: c.created_at ?? "",
    updated_at: c.updated_at ?? "",
    author_display_name: profile?.display_name ?? null,
    author_avatar_url: profile?.avatar_url ?? null,
    reactions,
  };
}

/**
 * Loads every comment for a project plus their author profile slice
 * and their reactions, organized into top-level threads. Top-level
 * comments are newest-first; replies under each parent are
 * oldest-first.
 */
export async function fetchCommentThreads(
  projectId: string,
  viewerUserId: string | null
): Promise<CommentThread[]> {
  const supabase = await createClient();
  const [commentsResult, reactionsResult] = await Promise.all([
    supabase
      .from("comments")
      .select("id, user_id, parent_comment_id, body, created_at, updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase.from("comment_reactions").select("comment_id, emoji, user_id"),
  ]);

  if (commentsResult.error) {
    throw commentsResult.error;
  }
  if (reactionsResult.error) {
    throw reactionsResult.error;
  }

  const commentRows = (commentsResult.data ?? []) as RawComment[];
  const userIds = Array.from(
    new Set(commentRows.map((c) => c.user_id).filter(Boolean) as string[])
  );

  const [profileMap, reactionMap] = [
    await fetchProfileMap(supabase, userIds),
    aggregateReactions(reactionsResult.data ?? [], viewerUserId),
  ];

  const tops: CommentRow[] = [];
  const repliesByParent = new Map<string, CommentRow[]>();
  for (const c of commentRows) {
    const row = buildRow(c, profileMap, reactionMap);
    if (c.parent_comment_id) {
      const list = repliesByParent.get(c.parent_comment_id) ?? [];
      list.push(row);
      repliesByParent.set(c.parent_comment_id, list);
    } else {
      tops.push(row);
    }
  }

  return tops.map((top) => {
    const replies = (repliesByParent.get(top.id) ?? [])
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    return { comment: top, replies };
  });
}
