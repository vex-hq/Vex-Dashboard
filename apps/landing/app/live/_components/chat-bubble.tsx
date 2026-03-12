interface ChatBubbleProps {
  role: 'customer' | 'agent';
  message: string;
  status?: 'pass' | 'flag' | 'block' | 'corrected';
  visible: boolean;
}

export function ChatBubble({
  role,
  message,
  status,
  visible,
}: ChatBubbleProps) {
  if (!visible) return null;

  const isCustomer = role === 'customer';

  const borderColor =
    status === 'block'
      ? 'border-red-500/50'
      : status === 'pass' || status === 'corrected'
        ? 'border-emerald-500/50'
        : 'border-[#333]';

  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-2 duration-500 ${
        isCustomer ? 'mr-auto max-w-lg' : 'ml-auto max-w-lg'
      }`}
    >
      <div className="mb-1 text-xs text-[#666]">
        {isCustomer ? 'Customer' : 'AI Agent'}
      </div>
      <div
        className={`rounded-xl border p-4 text-sm leading-relaxed ${
          isCustomer
            ? 'border-[#333] bg-[#1a1a1a] text-[#ccc]'
            : `bg-[#111] text-[#ccc] ${borderColor}`
        }`}
      >
        {message}
      </div>
    </div>
  );
}
