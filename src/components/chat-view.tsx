'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Pencil,
  Trash2,
  Rewind,
  Check,
  X,
  Send,
  Loader2,
  Copy,
  Volume2,
  Square,
} from 'lucide-react';
import { renderRichText } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface ChatViewProps {
  messages: ChatMessage[];
  characterName: string;
  characterAvatar?: string | null;
  voiceModelId?: string | null;
  onSend: (content: string) => Promise<void>;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRewind: (id: string, mode: 'to_before' | 'to_here') => Promise<void>;
  sending: boolean;
}

export function ChatView({
  messages,
  characterName,
  characterAvatar,
  voiceModelId,
  onSend,
  onEdit,
  onDelete,
  onRewind,
  sending,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    await onSend(text);
  }

  function startEdit(m: ChatMessage) {
    setEditingId(m.id);
    setEditDraft(m.content);
  }

  async function saveEdit() {
    if (!editingId) return;
    await onEdit(editingId, editDraft);
    setEditingId(null);
    setEditDraft('');
  }

  async function speakMessage(m: ChatMessage) {
    // If already speaking this message, stop
    if (speakingId === m.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeakingId(null);
      return;
    }
    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setTtsLoading(m.id);
    try {
      // Strip asterisk-wrapped actions for cleaner speech
      const cleanText = m.content.replace(/\*[^*]*\*/g, '').trim();
      const textToSpeak = cleanText || m.content;
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceModelId: voiceModelId || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Error al generar audio');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setSpeakingId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeakingId(null);
        URL.revokeObjectURL(url);
      };
      audioRef.current = audio;
      setSpeakingId(m.id);
      await audio.play();
    } catch (e) {
      toast({
        title: 'No se pudo generar el audio',
        description: e instanceof Error ? e.message : '',
        variant: 'destructive',
      });
    } finally {
      setTtsLoading(null);
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No hay mensajes todavía. Escribe algo para empezar a hablar con{' '}
            {characterName}.
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isEditing = editingId === m.id;
          return (
            <div
              key={m.id}
              className={`flex gap-3 group ${
                isUser ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className="w-9 h-9 shrink-0 mt-1">
                {isUser ? (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    Tú
                  </AvatarFallback>
                ) : (
                  <>
                    <AvatarImage
                      src={characterAvatar || undefined}
                      alt={characterName}
                    />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      {characterName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>

              <div
                className={`flex flex-col gap-1 max-w-[80%] ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2 w-full min-w-[260px]">
                    <Textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft('');
                        }}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    <div className="space-y-0.5">
                      {renderRichText(m.content)}
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isUser && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={ttsLoading === m.id}
                        onClick={() => speakMessage(m)}
                        title={voiceModelId ? 'Leer en voz alta (voz personalizada)' : 'Leer en voz alta (voz por defecto)'}
                      >
                        {ttsLoading === m.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : speakingId === m.id ? (
                          <Square className="w-3 h-3 mr-1" />
                        ) : (
                          <Volume2 className="w-3 h-3 mr-1" />
                        )}
                        {speakingId === m.id ? 'Detener' : 'Leer'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => startEdit(m)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(m.content);
                        toast({ title: 'Copiado' });
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onRewind(m.id, 'to_before')}
                    >
                      <Rewind className="w-3 h-3 mr-1" />
                      Rebobinar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => onDelete(m.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Borrar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex gap-3">
            <Avatar className="w-9 h-9 shrink-0 mt-1">
              <AvatarImage
                src={characterAvatar || undefined}
                alt={characterName}
              />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {characterName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs text-muted-foreground">
                {characterName} está escribiendo...
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-background p-3 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder={`Escribe a ${characterName}. Usa *texto entre asteriscos* para acciones.`}
          className="resize-none min-h-[44px] max-h-[160px]"
          style={{ height: 'auto' }}
        />
        <Button onClick={handleSend} disabled={sending || !input.trim()}>
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
