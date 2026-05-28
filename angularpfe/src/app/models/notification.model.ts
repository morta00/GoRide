export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  targetUrl: string;
  isRead: boolean;
  createdAt: string;
}
