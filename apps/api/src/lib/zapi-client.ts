import axios, { AxiosInstance } from "axios";
import type { ZApiSendTextPayload, ZApiStatusResponse } from "@bgpmassa/shared";

export class ZApiClient {
  private client: AxiosInstance;

  constructor(instanceId: string, token: string) {
    this.client = axios.create({
      baseURL: `https://api.z-api.io/instances/${instanceId}/token/${token}`,
      timeout: 15000,
      headers: {
        "Client-Token": process.env.ZAPI_CLIENT_TOKEN || "",
      },
    });
  }

  async sendText(payload: ZApiSendTextPayload): Promise<{ zaapId: string; messageId: string }> {
    const { data } = await this.client.post("/send-text", payload);
    return data;
  }

  async getStatus(): Promise<ZApiStatusResponse> {
    const { data } = await this.client.get("/status");
    return data;
  }

  async getQRCode(): Promise<{ value: string; type: "image" | "base64" }> {
    const { data } = await this.client.get("/qr-code/image");
    return data;
  }

  async getChats(page = 1, pageSize = 20): Promise<unknown[]> {
    const { data } = await this.client.get("/chats", {
      params: { page, pageSize },
    });
    return data;
  }

  async getMessages(phone: string, page = 1, pageSize = 50): Promise<unknown[]> {
    const { data } = await this.client.get("/messages", {
      params: { phone, page, pageSize },
    });
    return data;
  }

  async setWebhook(url: string): Promise<void> {
    await this.client.put("/update-webhook-delivery-url", { value: url, enabled: true });
  }
}
