"use client";

/**
 * Instagram DM-style chat bubble with message grouping.
 * Groups consecutive messages from the same sender.
 * Shows avatar only at last message of other's group.
 * Shows "읽음" only at last own message.
 * Shows timestamp between groups.
 */

type Message = {
  id: string;
  senderId: string;
  senderType: "BUYER" | "SELLER" | "SYSTEM";
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  readAt: string | null;
};

type ChatBubbleListProps = {
  messages: Message[];
  currentUserId: string;
  otherAvatarUrl?: string | null;
  otherName: string;
  lastReadMessageId?: string | null;
};

type GroupPosition = "single" | "first" | "middle" | "last";

function getGroupPosition(
  messages: Message[],
  index: number,
): GroupPosition {
  const msg = messages[index];
  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;

  const samePrev = prev && prev.senderId === msg.senderId && prev.senderType !== "SYSTEM";
  const sameNext = next && next.senderId === msg.senderId && next.senderType !== "SYSTEM";

  if (samePrev && sameNext) return "middle";
  if (samePrev && !sameNext) return "last";
  if (!samePrev && sameNext) return "first";
  return "single";
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function shouldShowTime(messages: Message[], index: number): boolean {
  const pos = getGroupPosition(messages, index);
  return pos === "single" || pos === "last";
}

function getBubbleRadius(isMine: boolean, pos: GroupPosition): string {
  // Instagram-style: connected corners use rounded-md, others rounded-2xl
  if (pos === "single") return "rounded-2xl";

  if (isMine) {
    // Right-aligned: connect on right side
    switch (pos) {
      case "first": return "rounded-2xl rounded-br-md";
      case "middle": return "rounded-2xl rounded-r-md";
      case "last": return "rounded-2xl rounded-tr-md";
    }
  } else {
    // Left-aligned: connect on left side
    switch (pos) {
      case "first": return "rounded-2xl rounded-bl-md";
      case "middle": return "rounded-2xl rounded-l-md";
      case "last": return "rounded-2xl rounded-tl-md";
    }
  }
  return "rounded-2xl";
}

export default function ChatBubbleList({
  messages,
  currentUserId,
  otherAvatarUrl,
  otherName,
  lastReadMessageId,
}: ChatBubbleListProps) {
  return (
    <div className="flex flex-col gap-0 px-3 py-4">
      {messages.map((msg, i) => {
        if (msg.senderType === "SYSTEM") {
          return (
            <div key={msg.id} className="flex justify-center my-3">
              <span className="px-3 py-1 bg-gray-50 text-[12px] text-gray-500 rounded-full">
                {msg.content}
              </span>
            </div>
          );
        }

        const isMine = msg.senderId === currentUserId;
        const pos = getGroupPosition(messages, i);
        const showTime = shouldShowTime(messages, i);
        const showAvatar = !isMine && (pos === "single" || pos === "last");
        const showSpacer = !isMine && !showAvatar;
        const isLastOwn = isMine && lastReadMessageId === msg.id;
        const radius = getBubbleRadius(isMine, pos);
        const gap = pos === "first" || pos === "single" ? "mt-3" : "mt-[2px]";

        return (
          <div
            key={msg.id}
            className={`flex ${isMine ? "justify-end" : "justify-start"} ${gap}`}
          >
            {/* Avatar / spacer for other's messages */}
            {!isMine && (
              <div className="w-7 h-7 shrink-0 mr-2 self-end">
                {showAvatar ? (
                  otherAvatarUrl ? (
                    <img
                      src={otherAvatarUrl}
                      alt={otherName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500">
                      {otherName.charAt(0)}
                    </div>
                  )
                ) : null}
              </div>
            )}

            <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[75%]`}>
              {/* Image message */}
              {msg.imageUrl && (
                <div className={`max-w-[220px] ${radius} overflow-hidden`}>
                  <img
                    src={msg.imageUrl}
                    alt=""
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Text message */}
              {msg.content && (
                <div
                  className={`px-3 py-2 text-[14px] leading-relaxed ${radius} ${
                    isMine
                      ? "bg-black text-white"
                      : "bg-gray-100 text-black"
                  }`}
                >
                  {msg.content}
                </div>
              )}

              {/* Time + read status */}
              {showTime && (
                <div className={`flex items-center gap-1 mt-1 ${isMine ? "flex-row-reverse" : ""}`}>
                  <span className="text-[11px] text-gray-400">
                    {formatTime(msg.createdAt)}
                  </span>
                  {isLastOwn && (
                    <span className="text-[11px] text-gray-400">읽음</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
