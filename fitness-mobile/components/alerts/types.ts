export type AlertSource = "friend" | "app";

export type AlertKind =
  | "friend_cheer"
  | "friend_comment"
  | "friend_follow"
  | "challenge_invite"
  | "streak_milestone"
  | "workout_reminder"
  | "nutrition_nudge"
  | "goal_progress"
  | "recovery_tip"
  | "system";

export type AlertPriority = 1 | 2 | 3 | 4; // 1 highest

export type AlertEntity =
  | { type: "workout"; id?: string; title?: string }
  | { type: "nutrition"; id?: string; title?: string }
  | { type: "goal"; id?: string; title?: string }
  | { type: "challenge"; id?: string; title?: string }
  | { type: "profile"; id?: string; title?: string };

export type AlertActor = {
  id: string;
  name: string;
  // optional avatar url later
};

export type AlertItem = {
  id: string;
  source: AlertSource;
  kind: AlertKind;
  priority: AlertPriority;

  title: string;
  body?: string;

  actor?: AlertActor; // friend alerts
  entity?: AlertEntity; // deep link context

  createdAt: number; // epoch ms

  read: boolean;
  pinned?: boolean; // user pinned / keep at top
  actionable?: boolean; // shows CTA chip
};
