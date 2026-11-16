import { SignInFlow } from '@/components/auth/SignInFlow';

/** `/login`: the email-first sign-in screen (see SignInFlow). */
export default function Login() {
  return <SignInFlow mode="signin" />;
}
