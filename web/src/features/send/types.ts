export type SendMessageInput = {
  deviceId: string;
  phone: string;
  message: string;
  async?: boolean;
  delaySeconds?: number;
};

export type SendMessageResult = {
  code?: string;
  message: string;
  status?: string;
  messageId?: string;
  jobId?: string;
  deviceId?: string;
  phone?: string;
};
