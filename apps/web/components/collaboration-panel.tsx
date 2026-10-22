"use client";

import type {
  CommentDto,
  MemberDto,
  SpaceInviteDto,
  TaskDto,
} from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import {
  COMMENTS_ENDPOINT,
  commentEndpoint,
  commentsEndpoint,
  inviteEndpoint,
  invitesEndpoint,
  joinInviteEndpoint,
  memberEndpoint,
  membersEndpoint,
  taskEndpoint,
  taskListEndpoint,
} from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "协作与讨论",
    members: "成员",
    assignTitle: "任务分配",
    assignTask: "选择任务",
    assignMember: "分配给",
    assign: "分配",
    unassigned: "未分配",
    invite: "邀请成员",
    role: "角色",
    editor: "编辑者",
    viewer: "只读",
    owner: "所有者",
    createInvite: "生成邀请码",
    noInvites: "还没有有效邀请。",
    revoke: "撤销",
    copy: "复制",
    copied: "已复制",
    discussion: "空间讨论",
    commentPlaceholder: "写一条讨论…",
    post: "发布",
    empty: "还没有讨论。",
    remove: "移除",
    joinTitle: "用邀请码加入空间",
    joinPlaceholder: "粘贴邀请码",
    join: "加入",
    joinSuccess: "已加入，刷新页面查看空间。",
    joinFailed: "邀请码无效或已用完。",
  },
  en: {
    title: "Collaboration",
    members: "Members",
    assignTitle: "Task assignment",
    assignTask: "Choose a task",
    assignMember: "Assign to",
    assign: "Assign",
    unassigned: "Unassigned",
    invite: "Invite",
    role: "Role",
    editor: "Editor",
    viewer: "Viewer",
    owner: "Owner",
    createInvite: "Create invite code",
    noInvites: "No active invites.",
    revoke: "Revoke",
    copy: "Copy",
    copied: "Copied",
    discussion: "Space discussion",
    commentPlaceholder: "Write a comment…",
    post: "Post",
    empty: "No comments yet.",
    remove: "Remove",
    joinTitle: "Join a space with an invite code",
    joinPlaceholder: "Paste invite code",
    join: "Join",
    joinSuccess: "Joined. Refresh to see the space.",
    joinFailed: "Invite is invalid or used up.",
  },
} as const;

export function CollaborationPanel({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [invites, setInvites] = useState<SpaceInviteDto[]>([]);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [assignTaskId, setAssignTaskId] = useState("");
  const [assignMemberId, setAssignMemberId] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [copied, setCopied] = useState("");
  const [commentText, setCommentText] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [membersResponse, invitesResponse, commentsResponse, tasksResponse] = await Promise.all([
      fetch(membersEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(invitesEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(commentsEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(taskListEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
    ]);
    if (membersResponse.ok) {
      setMembers(((await membersResponse.json()) as { members: MemberDto[] }).members);
    }
    if (invitesResponse.ok) {
      setInvites(((await invitesResponse.json()) as { invites: SpaceInviteDto[] }).invites);
    }
    if (commentsResponse.ok) {
      setComments(((await commentsResponse.json()) as { comments: CommentDto[] }).comments);
    }
    if (tasksResponse.ok) {
      setTasks(((await tasksResponse.json()) as { tasks: TaskDto[] }).tasks);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createInvite = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(invitesEndpoint(spaceId), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ role: inviteRole, expiresInHours: 72, maxUses: 1 }),
      });
      if (response.ok) await load();
    } finally {
      setBusy(false);
    }
  }, [inviteRole, load, spaceId]);

  const revoke = useCallback(
    async (invite: SpaceInviteDto) => {
      await fetch(inviteEndpoint(spaceId, invite.id), {
        method: "DELETE",
        credentials: "include",
      });
      await load();
    },
    [load, spaceId],
  );

  const copyToken = useCallback(async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopied(token);
  }, []);

  const changeRole = useCallback(
    async (member: MemberDto, role: string) => {
      await fetch(memberEndpoint(spaceId, member.userId), {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ role }),
      });
      await load();
    },
    [load, spaceId],
  );

  const removeMember = useCallback(
    async (member: MemberDto) => {
      await fetch(memberEndpoint(spaceId, member.userId), {
        method: "DELETE",
        credentials: "include",
      });
      await load();
    },
    [load, spaceId],
  );

  const postComment = useCallback(async () => {
    if (!commentText.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(COMMENTS_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          spaceId,
          entityType: "space",
          entityId: spaceId,
          body: commentText.trim(),
        }),
      });
      if (response.ok) {
        setCommentText("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, commentText, load, spaceId]);

  const deleteComment = useCallback(
    async (comment: CommentDto) => {
      await fetch(commentEndpoint(comment.id), { method: "DELETE", credentials: "include" });
      await load();
    },
    [load],
  );

  const assign = useCallback(async () => {
    if (!assignTaskId || !assignMemberId) return;
    await fetch(taskEndpoint(assignTaskId), {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ assigneeId: assignMemberId }),
    });
    await load();
  }, [assignMemberId, assignTaskId, load]);

  const join = useCallback(async () => {
    if (!joinToken.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(joinInviteEndpoint(joinToken.trim()), {
        method: "POST",
        credentials: "include",
      });
      setMessage(response.ok ? text.joinSuccess : text.joinFailed);
      if (response.ok) setJoinToken("");
    } finally {
      setBusy(false);
    }
  }, [busy, joinToken, text.joinFailed, text.joinSuccess]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{text.title}</h3>

      <h4 className="mt-4 text-sm font-semibold text-muted">{text.members}</h4>
      <ul className="mt-2 flex flex-col gap-2">
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
          >
            <span>
              {member.displayName}
              <span className="ml-2 text-xs text-muted">
                {member.role === "owner" ? text.owner : member.role === "editor" ? text.editor : text.viewer}
              </span>
            </span>
            <span className="flex items-center gap-2 text-xs">
              {member.role !== "owner" ? (
                <>
                  <select
                    value={member.role}
                    onChange={(event) => void changeRole(member, event.target.value)}
                    aria-label={text.role}
                    className="rounded-lg border border-line bg-surface px-2 py-1"
                  >
                    <option value="editor">{text.editor}</option>
                    <option value="viewer">{text.viewer}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void removeMember(member)}
                    className="text-muted hover:text-danger"
                  >
                    {text.remove}
                  </button>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <h4 className="mt-4 text-sm font-semibold text-muted">{text.assignTitle}</h4>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <select
          value={assignTaskId}
          onChange={(event) => setAssignTaskId(event.target.value)}
          aria-label={text.assignTask}
          className="flex-1 rounded-lg border border-line bg-canvas px-2 py-2 text-sm"
        >
          <option value="">{text.assignTask}</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
        <select
          value={assignMemberId}
          onChange={(event) => setAssignMemberId(event.target.value)}
          aria-label={text.assignMember}
          className="flex-1 rounded-lg border border-line bg-canvas px-2 py-2 text-sm"
        >
          <option value="">{text.assignMember}</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void assign()}
          disabled={!assignTaskId || !assignMemberId}
          className="rounded-lg bg-accent-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-50"
        >
          {text.assign}
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
        {tasks.slice(0, 8).map((task) => {
          const assignee = members.find((member) => member.userId === task.assigneeId);
          return (
            <li key={task.id}>
              {task.title} · {assignee ? assignee.displayName : text.unassigned}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          {text.invite} · {text.role}
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}
            className="ml-2 rounded-lg border border-line bg-canvas px-2 py-1 text-sm"
          >
            <option value="editor">{text.editor}</option>
            <option value="viewer">{text.viewer}</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void createInvite()}
          disabled={busy}
          className="rounded-lg bg-accent-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-50"
        >
          {text.createInvite}
        </button>
      </div>
      {invites.length === 0 ? (
        <p className="mt-2 text-xs text-muted">{text.noInvites}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-xs">
          {invites.map((invite) => (
            <li key={invite.id} className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-canvas px-2 py-1">{invite.token}</code>
              <span className="text-muted">
                {invite.role} · {invite.uses}/{invite.maxUses}
              </span>
              <button
                type="button"
                onClick={() => void copyToken(invite.token)}
                className="text-accent-ink hover:underline"
              >
                {copied === invite.token ? text.copied : text.copy}
              </button>
              <button
                type="button"
                onClick={() => void revoke(invite)}
                className="text-muted hover:text-danger"
              >
                {text.revoke}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-xl border border-line bg-canvas p-3">
        <p className="text-xs font-semibold text-muted">{text.joinTitle}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={joinToken}
            onChange={(event) => setJoinToken(event.target.value)}
            placeholder={text.joinPlaceholder}
            aria-label={text.joinPlaceholder}
            className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void join()}
            disabled={busy || !joinToken.trim()}
            className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent disabled:opacity-50"
          >
            {text.join}
          </button>
        </div>
        {message ? <p className="mt-1 text-xs text-muted">{message}</p> : null}
      </div>

      <h4 className="mt-5 text-sm font-semibold text-muted">{text.discussion}</h4>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder={text.commentPlaceholder}
          aria-label={text.commentPlaceholder}
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void postComment()}
          disabled={busy || !commentText.trim()}
          className="rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {text.post}
        </button>
      </div>
      {comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{text.empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm">
              <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
                <span>{comment.authorName}</span>
                <button
                  type="button"
                  onClick={() => void deleteComment(comment)}
                  className="hover:text-danger"
                >
                  {text.remove}
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
