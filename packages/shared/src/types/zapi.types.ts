/** Z-API webhook event types */
export type ZApiEventType =
  | "ReceivedCallback"
  | "SentCallback"
  | "DeliveryCallback"
  | "ReadCallback"
  | "ConnectedCallback"
  | "DisconnectedCallback"
  | "AllUnreadMessagesCallback";

export interface ZApiWebhookPayload {
  instanceId: string;
  messageId: string;
  phone: string;
  fromMe: boolean;
  momment: number; // timestamp ms
  status: "PENDING" | "SENT" | "RECEIVED" | "READ" | "PLAYED";
  chatName: string;
  senderPhoto?: string;
  senderName: string;
  participantPhone?: string; // for group messages
  photo?: string;
  broadcast: boolean;
  type: ZApiMessageType;
  text?: { message: string };
  image?: { caption?: string; mimeType: string; imageUrl: string };
  audio?: { mimeType: string; audioUrl: string; ptt: boolean };
  video?: { caption?: string; mimeType: string; videoUrl: string };
  document?: { mimeType: string; fileName: string; documentUrl: string };
  sticker?: { mimeType: string; stickerUrl: string };
  location?: { latitude: string; longitude: string; name?: string };
  isGroup: boolean;
  isStatusReply: boolean;
  chatId: string;
}

export type ZApiMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker"
  | "location"
  | "template";

export interface ZApiSendTextPayload {
  phone: string;
  message: string;
}

export interface ZApiStatusResponse {
  connected: boolean;
  smartphoneConnected: boolean;
  error?: string;
}
