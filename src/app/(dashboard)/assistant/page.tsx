import ChatWindow from "@/components/assistant/ChatWindow";

export default function AssistantPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-gray-500">
          Ask questions about your applications, grounded in their real status and history
        </p>
      </div>
      <ChatWindow />
    </div>
  );
}
