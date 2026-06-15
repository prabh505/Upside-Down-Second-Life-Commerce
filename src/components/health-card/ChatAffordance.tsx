"use client";

/**
 * src/components/health-card/ChatAffordance.tsx
 *
 * MVP stub: pre-scripted chat responses based on pattern matching against
 * the GradingResult fields. No real LLM API call.
 *
 * Patterns:
 *   "scratch" / "defect" / "damage" → lists result.defects
 *   "expir" → reads expiry_date
 *   "price" / "worth" / "value" → reads second_life_score + recommended_route
 *   "accessori" / "includ" / "complet" → reads result.completeness
 *   fallback → help message listing capabilities
 *
 * Max 10 messages. aria-live="polite" on messages container.
 * Hidden in print CSS via print:hidden on the outer container.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import type { GradingResult } from "@/lib/types";

interface ChatAffordanceProps {
  result: GradingResult;
  productName: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const MAX_MESSAGES = 10;

function generateResponse(query: string, result: GradingResult, productName: string): string {
  const q = query.toLowerCase();

  // ── Defects / scratches / damage ──────────────────────────────────────────
  if (q.includes("scratch") || q.includes("defect") || q.includes("damage") || q.includes("dent") || q.includes("crack")) {
    if (result.defects.length === 0) {
      return `No defects were observed on the ${productName}. The item was graded ${result.condition_grade} (${result.condition_label}).`;
    }
    const defectList = result.defects.map((d) => `• ${d}`).join("\n");
    return `The following defects were observed on the ${productName}:\n${defectList}`;
  }

  // ── Expiry / date ─────────────────────────────────────────────────────────
  if (q.includes("expir") || q.includes("date") || q.includes("shelf")) {
    if (result.expiry_date) {
      const d = new Date(result.expiry_date);
      const formatted = d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const now = new Date();
      if (d <= now) {
        return `This item expired on ${formatted}. It has been routed to ${result.recommended_route}.`;
      }
      return `The expiry date is ${formatted}. Date source: ${result.date_source === "label_ocr" ? "extracted from the label photo" : result.date_source === "estimated" ? "estimated from purchase date and shelf life" : "not available"}.`;
    }
    return `No expiry date was found for this item. Date source: ${result.date_source}.`;
  }

  // ── Price / value / worth ─────────────────────────────────────────────────
  if (q.includes("price") || q.includes("worth") || q.includes("value") || q.includes("cost") || q.includes("resale")) {
    return `The estimated resale value is ${result.second_life_score}% of original price. The recommended route is "${result.recommended_route}". The item was graded ${result.condition_grade} (${result.condition_label}).`;
  }

  // ── Accessories / completeness ────────────────────────────────────────────
  if (q.includes("accessori") || q.includes("includ") || q.includes("complet") || q.includes("missing") || q.includes("parts")) {
    return `Completeness assessment: ${result.completeness}`;
  }

  // ── Grade / condition ─────────────────────────────────────────────────────
  if (q.includes("grade") || q.includes("condition") || q.includes("quality")) {
    return `The ${productName} was graded ${result.condition_grade} (${result.condition_label}) with ${Math.round(result.model_confidence * 100)}% confidence. ${result.defects.length > 0 ? `${result.defects.length} defect(s) were observed.` : "No defects were observed."}`;
  }

  // ── Route / recommendation ────────────────────────────────────────────────
  if (q.includes("route") || q.includes("recommend") || q.includes("should") || q.includes("what do")) {
    return `The recommended action is: ${result.recommended_route}. ${result.routing_logic_trace.length > 0 ? result.routing_logic_trace[result.routing_logic_trace.length - 1] : ""}`;
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return "I can answer questions about condition, expiry, accessories, and estimated value for this item.";
}

export default function ChatAffordance({
  result,
  productName,
}: ChatAffordanceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: `Ask me anything about the ${productName} — condition, defects, expiry, accessories, or estimated value.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isCapped, setIsCapped] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (messages.length >= MAX_MESSAGES) {
      setIsCapped(true);
      return;
    }

    const userMsg: ChatMessage = { role: "user", text: trimmed };
    const responseText = generateResponse(trimmed, result, productName);
    const assistantMsg: ChatMessage = { role: "assistant", text: responseText };

    setMessages((prev) => {
      const next = [...prev, userMsg, assistantMsg];
      if (next.length >= MAX_MESSAGES) setIsCapped(true);
      return next;
    });
    setInput("");

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, messages.length, result, productName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-gray-200 print:hidden">
      {/* ── Header ── */}
      <div className="px-5 py-3 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Ask about this item
        </span>
        <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono">
          MVP
        </span>
      </div>

      {/* ── Messages ── */}
      <div
        className="px-5 max-h-52 overflow-y-auto space-y-2.5 pb-2"
        aria-live="polite"
        aria-label="Chat messages"
        role="log"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={[
              "text-xs leading-relaxed rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-line",
              msg.role === "user"
                ? "bg-gray-100 text-gray-800 ml-auto"
                : "bg-blue-50 text-gray-700 mr-auto",
            ].join(" ")}
          >
            {msg.text}
          </div>
        ))}

        {isCapped && (
          <div className="text-center">
            <p className="text-[10px] text-gray-400 italic">
              Chat history is full for this session.
            </p>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* ── Input ── */}
      <div className="px-5 pb-4 pt-1">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isCapped}
            placeholder={isCapped ? "Chat history full" : "Type a question…"}
            aria-label="Type a question about this item"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800
                       placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300
                       disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isCapped || !input.trim()}
            aria-label="Send message"
            className="shrink-0 w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center
                       hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
