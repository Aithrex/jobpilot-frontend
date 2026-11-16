import { SignInFlow } from '@/components/auth/SignInFlow';

/**
 * `/register`: the same email-first screen as `/login`, worded for someone
 * new. An address that already has an account is steered to signing in.
 */
export default function Register() {
  return <SignInFlow mode="signup" />;
}
