import { redirect } from 'next/navigation';

export default async function GuidelinesAdminPage() {
  redirect('/admin?tab=guidelines');
}
