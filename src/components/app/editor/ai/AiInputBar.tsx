"use client";

import React, { useRef } from "react";
import { Paperclip, Mic, Send, Image, Camera, FolderOpen } from "lucide-react";
import styles from "./AiInputBar.module.css";

type AiInputBarProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
};

const AiInputBar = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled = false,
}: AiInputBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Files selected:", e.target.files);
  };

  return (
    <div className={styles.containerIaChat}>
      {/* Hidden checkboxes for state management */}
      <input
        type="checkbox"
        name="input-voice"
        id="input-voice"
        className={styles.inputVoice}
      />
      <input
        type="checkbox"
        name="input-files"
        id="input-files"
        className={styles.inputFiles}
      />

      {/* Text input */}
      <input
        ref={inputRef}
        type="text"
        name="input-text"
        id="input-text"
        placeholder="Escribe un mensaje..."
        className={styles.inputText}
        value={value}
        onChange={onChange}
        onKeyPress={onKeyPress}
        disabled={disabled}
        autoComplete="off"
      />

      {/* Upload files popup */}
      <div className={styles.containerUploadFiles}>
        <Camera
          className={styles.uploadFile}
          size={20}
          onClick={() => fileInputRef.current?.click()}
        />
        <Image
          className={styles.uploadFile}
          size={20}
          onClick={() => fileInputRef.current?.click()}
        />
        <FolderOpen
          className={styles.uploadFile}
          size={20}
          onClick={() => fileInputRef.current?.click()}
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
        accept="image/*,.pdf,.doc,.docx"
      />

      {/* Attach files button */}
      <label htmlFor="input-files" className={styles.labelFiles}>
        <Paperclip size={18} />
      </label>

      {/* Voice button */}
      <label htmlFor="input-voice" className={styles.labelVoice}>
        <Mic size={18} className={styles.iconVoice} />
        <div className={styles.ai}>
          <div className={styles.container}>
            <div className={`${styles.c} ${styles.c4}`} />
            <div className={`${styles.c} ${styles.c1}`} />
            <div className={`${styles.c} ${styles.c2}`} />
            <div className={`${styles.c} ${styles.c3}`} />
            <div className={styles.rings} />
          </div>
          <div className={styles.glass} />
        </div>
        <div className={styles.textVoice}>
          <p>Escuchando...</p>
          <p>Toca para cancelar</p>
        </div>
      </label>

      {/* Send button */}
      <label className={styles.labelText} onClick={onSend}>
        <Send size={18} />
      </label>
    </div>
  );
};

export default AiInputBar;
