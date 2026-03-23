import { useAuthSession } from './hooks/useAuthSession';
import App from './App';

export default function AppBootstrap() {
  useAuthSession();
  return <App />;
}
