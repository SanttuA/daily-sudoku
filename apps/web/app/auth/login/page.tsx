import { AuthForm } from '../../../components/auth-form';

export default function LoginPage() {
  return (
    <div className="single-column">
      <AuthForm mode="login" />
    </div>
  );
}
