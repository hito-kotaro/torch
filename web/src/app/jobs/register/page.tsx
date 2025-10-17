import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import RegisterClient from './RegisterClient';

export default async function RegisterPage() {
  const userIsAdmin = await isAdmin();

  // 管理者でない場合は案件一覧にリダイレクト
  if (!userIsAdmin) {
    redirect('/jobs');
  }

  return <RegisterClient />;
}
