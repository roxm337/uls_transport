import { redirect } from 'next/navigation';

/**
 * The CRM has no public surface — the marketing site lives on
 * uls-transport.com. Anyone hitting the root goes to sign-in, and the
 * middleware forwards an authenticated session on to /admin.
 */
export default function RootPage() {
  redirect('/login');
}
