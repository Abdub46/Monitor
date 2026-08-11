"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

const SUGGESTIONS = [
  "Why is my application slow?",
  "What caused my most recent outage?",
  "Summarize all incidents this week",
  "Suggest improvements",
  "How can I prevent this error?",
];

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/assistant/history")
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
        setLoadingHistory(false);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;

    setError(null);
    setSending(true);
    setInput("");

    // Optimistically show the user's message immediately.
    const optimisticId = `pending-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, role: "user", content: text }]);

    const res = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    setSending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }

    const data = await res.json();
    setMessages((prev) => [...prev, { id: data.id, role: "assistant", content: data.content }]);
  }

  return (
    <div className="flex flex-col h-[70vh] sm:h-[calc(100vh-180px)] rounded-lg border border-gray-800 bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingHistory ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Ask about your applications' status, incidents, or reliability trends.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs rounded-full border border-gray-700 px-3 py-1.5 text-gray-400 hover:text-gray-100 hover:border-gray-500"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-sm bg-gray-800 text-gray-400">
              Thinking...
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="border-t border-gray-800 p-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your applications..."
          disabled={sending}
          className="flex-1 rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
