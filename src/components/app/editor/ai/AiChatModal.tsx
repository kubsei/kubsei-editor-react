"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import styles from "./AiChatModal.module.css";
import AiInputBar from "./AiInputBar";

type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
};

type AiChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AiChatModal = ({ isOpen, onClose }: AiChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hola, soy tu asistente de IA para el canvas. Puedo ayudarte a crear elementos como circulos, cuadrados y lineas. ¿En que puedo ayudarte?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const processCanvasCommand = (message: string) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("círculo") || lowerMessage.includes("circulo")) {
      console.log("Crear círculo en canvas");
      return "He creado un circulo en el canvas. ¿Te gustaria modificar su color o tamaño?";
    } else if (
      lowerMessage.includes("cuadrado") ||
      lowerMessage.includes("rectángulo")
    ) {
      console.log("Crear cuadrado en canvas");
      return "He creado un cuadrado en el canvas. ¿Necesitas ajustar sus dimensiones?";
    } else if (lowerMessage.includes("línea") || lowerMessage.includes("linea")) {
      console.log("Crear línea en canvas");
      return "He dibujado una linea en el canvas. ¿Quieres cambiar su grosor o color?";
    }

    return "Entendido. Puedo ayudarte a crear circulos, cuadrados y lineas en el canvas. Solo dime que necesitas.";
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userText = inputValue;
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = processCanvasCommand(userText);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: "bot",
        timestamp: new Date(),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botMessage]);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          ref={dragHandleRef}
          className={styles.header}
          onMouseDown={handleDragStart}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <div className={styles.dragHandle} />
          <div className={styles.titleContainer}>
            <div className={styles.aiAvatar}>
              <Sparkles className={styles.aiAvatarIcon} />
            </div>
            <div className={styles.titleInfo}>
              <h2 className={styles.title}>AI Assistant</h2>
              <div className={styles.statusIndicator}>
                <span className={styles.statusDot} />
                <span>En linea</span>
              </div>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Messages Container */}
        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.sender === "user"
                  ? styles.userMessage
                  : styles.botMessage
              }`}
            >
              <div className={styles.messageAvatar}>
                {message.sender === "bot" ? (
                  <Sparkles size={14} />
                ) : (
                  "Tu"
                )}
              </div>
              <div className={styles.messageContent}>
                <div className={styles.messageBubble}>
                  <p>{message.text}</p>
                </div>
                <span className={styles.messageTime}>
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className={`${styles.message} ${styles.botMessage}`}>
              <div className={styles.messageAvatar}>
                <Sparkles size={14} />
              </div>
              <div className={styles.typingDots}>
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={styles.inputContainer}>
          <AiInputBar
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSend={handleSendMessage}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            disabled={isTyping}
          />
        </div>
      </div>
    </div>
  );
};

export default AiChatModal;
