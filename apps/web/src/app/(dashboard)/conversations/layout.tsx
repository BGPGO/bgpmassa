"use client";

import { ConversationListPanel } from "../../../components/conversations/ConversationListPanel";

export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <ConversationListPanel />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
