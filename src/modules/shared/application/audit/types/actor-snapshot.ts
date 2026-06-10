export type ActorType = 'user' | 'system' | 'anonymous';

export type ActorSnapshot = {
  actorId: string | null;
  actorType: ActorType;
  displayName?: string;
};

export const ANONYMOUS_ACTOR: ActorSnapshot = {
  actorId: null,
  actorType: 'anonymous',
};
