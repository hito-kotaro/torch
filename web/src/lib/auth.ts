import { currentUser } from '@clerk/nextjs/server';

export type UserRole = 'admin' | 'general';

export async function getUserRole(): Promise<UserRole> {
  const user = await currentUser();

  if (!user) {
    return 'general';
  }

  // Clerkのpublicメタデータからroleを取得
  const role = user.publicMetadata?.role as UserRole | undefined;

  return role === 'admin' ? 'admin' : 'general';
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}
