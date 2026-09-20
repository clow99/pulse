import Link from 'next/link';
import RegistrationForm from './RegistrationForm';
import { publicRegistrationEnabled } from '@/lib/registration';
export const dynamic = 'force-dynamic';
export default function RegisterPage() {
  if (publicRegistrationEnabled()) return <RegistrationForm />;
  return <main><h1>Private preview</h1><p>Public registration is closed. Existing invited users can sign in.</p><p><Link href="/login">Sign in</Link> · <Link href="/demo">Preview information</Link></p></main>;
}
