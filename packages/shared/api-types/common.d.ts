export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success?: false;
  status?: 'error' | 'fail';
  message: string;
}
