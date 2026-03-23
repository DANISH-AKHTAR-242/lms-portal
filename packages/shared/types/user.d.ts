export interface UserProfile {
  _id: string;
  fullname: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  avatar?: string;
}
