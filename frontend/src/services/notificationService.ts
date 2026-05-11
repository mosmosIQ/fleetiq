import { api } from "./api";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export async function listNotifications() {
  const response = await api.get<Notification[]>("/notifications");
  return response.data;
}

export async function markNotificationAsRead(notificationId: string) {
  const response = await api.patch<Notification>(
    `/notifications/${notificationId}/read`
  );

  return response.data;
}