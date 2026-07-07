'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Users,
  Globe,
  MessageSquare,
  Pencil,
  Trash2,
  Share2,
  Sparkles,
  MessageCircle,
  Home,
  Search,
  Loader2,
  Lock,
  Globe2,
} from 'lucide-react';
import { CharacterForm, type CharacterFormData } from './character-form';
import { ChatView, type ChatMessage } from './chat-view';
import { AuthBar } from './auth-bar';
import { useToast } from '@/hooks/use-toast';

interface Character {
  id: string;
  name: string;
  description: string;
  physicalDescription: string | null;
  psychologicalDescription: string | null;
  scenario: string | null;
  greeting: string | null;
  avatar: string | null;
  creatorName: string | null;
  tags: string | null;
  visibility: 'private' | 'public';
  userId?: string;
  user?: { name: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

interface Chat {
  id: string;
  title: string;
  characterId: string;
  character?: Character;
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

type View =
  | { kind: 'home' }
  | { kind: 'gallery' }
  | { kind: 'create' }
  | { kind: 'edit'; character: Character }
  | { kind: 'character'; character: Character }
  | { kind: 'chat'; chat: Chat };

type Tab = 'mine' | 'gallery' | 'chats';

export function CharacterApp() {
  const [tab, setTab] = useState<Tab>('mine');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [gallery, setGallery] = useState<Character[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: 'character'; id: string; name: string }
    | { type: 'chat'; id: string; title: string }
    | null
  >(null);
  const [chatNamePrompt, setChatNamePrompt] = useState<Character | null>(null);
  const [chatNameValue, setChatNameValue] = useState('');
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  const loadCharacters = useCallback(async () => {
    const res = await fetch('/api/characters');
    const json = await res.json();
    setCharacters(json.characters || []);
  }, []);

  const loadGallery = useCallback(async () => {
    const res = await fetch('/api/gallery');
    const json = await res.json();
    setGallery(json.characters || []);
  }, []);

  const loadChats = useCallback(async () => {
    const res = await fetch('/api/chats');
    const json = await res.json();
    setChats(json.chats || []);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    loadCharacters();
    loadChats();
    if (tab === 'gallery') loadGallery();
    // reset view to home if user logged out
    if (!isAuthenticated) {
      setView((prev) =>
        prev.kind === 'create' ||
        prev.kind === 'edit' ||
        prev.kind === 'chat'
          ? { kind: 'home' }
          : prev,
      );
    }
  }, [status, isAuthenticated, loadCharacters, loadChats, loadGallery, tab]);

  useEffect(() => {
    if (tab === 'gallery') loadGallery();
  }, [tab, loadGallery]);

  async function createCharacter(data: CharacterFormData) {
    setLoading(true);
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await loadCharacters();
      toast({ title: 'Personaje creado' });
      setView({ kind: 'character', character: json.character });
    } catch (e) {
      toast({
        title: 'No se pudo crear',
        description: e instanceof Error ? e.message : '',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateCharacter(id: string, data: CharacterFormData) {
    setLoading(true);
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await loadCharacters();
      toast({ title: 'Personaje actualizado' });
      setView({ kind: 'character', character: json.character });
    } catch (e) {
      toast({
        title: 'No se pudo actualizar',
        description: e instanceof Error ? e.message : '',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteCharacter(id: string) {
    await fetch(`/api/characters/${id}`, { method: 'DELETE' });
    await loadCharacters();
    setConfirmDelete(null);
    if (view.kind === 'character' && view.character.id === id) {
      setView({ kind: 'home' });
    }
    toast({ title: 'Personaje eliminado' });
  }

  async function togglePublish(c: Character) {
    const nextVisibility = c.visibility === 'public' ? 'private' : 'public';
    const res = await fetch(`/api/characters/${c.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: nextVisibility }),
    });
    const json = await res.json();
    if (res.ok) {
      await loadCharacters();
      loadGallery();
      toast({
        title:
          nextVisibility === 'public'
            ? 'Personaje público en la galería'
            : 'Personaje guardado como privado',
      });
      if (view.kind === 'character' && view.character.id === c.id) {
        setView({ kind: 'character', character: json.character });
      }
    }
  }

  async function startChat(c: Character, title: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: c.id,
          title: title.trim() || `Chat con ${c.name}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await loadChats();
      setView({ kind: 'chat', chat: json.chat });
    } catch (e) {
      toast({
        title: 'No se pudo iniciar el chat',
        description: e instanceof Error ? e.message : '',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function renameChat(id: string, title: string) {
    const res = await fetch(`/api/chats/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const json = await res.json();
      setView((prev) =>
        prev.kind === 'chat' && prev.chat.id === id
          ? { ...prev, chat: { ...prev.chat, title: json.chat.title } }
          : prev,
      );
      await loadChats();
      toast({ title: 'Chat renombrado' });
    }
  }

  async function openChat(chat: Chat) {
    const res = await fetch(`/api/chats/${chat.id}`);
    const json = await res.json();
    if (res.ok) setView({ kind: 'chat', chat: json.chat });
  }

  async function deleteChat(id: string) {
    await fetch(`/api/chats/${id}`, { method: 'DELETE' });
    await loadChats();
    setConfirmDelete(null);
    if (view.kind === 'chat' && view.chat.id === id) {
      setView({ kind: 'home' });
    }
    toast({ title: 'Chat eliminado' });
  }

  // Chat operations
  const [sending, setSending] = useState(false);

  async function sendMessage(content: string) {
    if (view.kind !== 'chat') return;
    const chatId = view.chat.id;
    setSending(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setView((prev) =>
        prev.kind === 'chat'
          ? {
              ...prev,
              chat: {
                ...prev.chat,
                messages: [
                  ...(prev.chat.messages || []),
                  json.userMsg,
                  json.assistantMsg,
                ],
              },
            }
          : prev,
      );
      await loadChats();
    } catch (e) {
      toast({
        title: 'La IA no respondió',
        description: e instanceof Error ? e.message : '',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  async function editMessage(id: string, content: string) {
    if (view.kind !== 'chat') return;
    const res = await fetch(`/api/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      setView((prev) =>
        prev.kind === 'chat'
          ? {
              ...prev,
              chat: {
                ...prev.chat,
                messages: (prev.chat.messages || []).map((m) =>
                  m.id === id ? { ...m, content } : m,
                ),
              },
            }
          : prev,
      );
      toast({ title: 'Mensaje editado' });
    }
  }

  async function deleteMessage(id: string) {
    if (view.kind !== 'chat') return;
    const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setView((prev) =>
        prev.kind === 'chat'
          ? {
              ...prev,
              chat: {
                ...prev.chat,
                messages: (prev.chat.messages || []).filter(
                  (m) => m.id !== id,
                ),
              },
            }
          : prev,
      );
      toast({ title: 'Mensaje eliminado' });
    }
  }

  async function rewindMessage(id: string, mode: 'to_before' | 'to_here') {
    if (view.kind !== 'chat') return;
    const res = await fetch(
      `/api/messages/${id}/rewind?mode=${mode}`,
      { method: 'POST' },
    );
    const json = await res.json();
    if (res.ok) {
      setView((prev) =>
        prev.kind === 'chat'
          ? { ...prev, chat: { ...prev.chat, messages: json.messages } }
          : prev,
      );
      toast({ title: 'Rebobinado' });
    }
  }

  // -- render helpers --

  const filteredMine = characters.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.tags || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-sidebar flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b">
          <Button
            className="w-full"
            disabled={!isAuthenticated}
            onClick={() => {
              if (isAuthenticated) setView({ kind: 'create' });
            }}
            title={
              isAuthenticated ? '' : 'Inicia sesión para crear personajes'
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Crear personaje
          </Button>
        </div>

        <div className="flex gap-1 px-2 pt-3">
          <TabBtn
            active={tab === 'mine'}
            onClick={() => setTab('mine')}
            icon={<Users className="w-3.5 h-3.5" />}
            label="Míos"
          />
          <TabBtn
            active={tab === 'chats'}
            onClick={() => setTab('chats')}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
            label="Chats"
          />
          <TabBtn
            active={tab === 'gallery'}
            onClick={() => setTab('gallery')}
            icon={<Globe className="w-3.5 h-3.5" />}
            label="Galería"
          />
        </div>

        <div className="px-3 py-2">
          {tab !== 'chats' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="h-8 pl-7 text-sm"
              />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-2 pb-4">
          {tab === 'mine' && (
            <div className="space-y-1">
              {filteredMine.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 px-3">
                  Aún no tienes personajes. Crea uno con el botón de arriba.
                </p>
              )}
              {filteredMine.map((c) => (
                <CharacterRow
                  key={c.id}
                  c={c}
                  onOpen={() => setView({ kind: 'character', character: c })}
                  active={
                    view.kind === 'character' && view.character.id === c.id
                  }
                />
              ))}
            </div>
          )}

          {tab === 'chats' && (
            <div className="space-y-1">
              {chats.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 px-3">
                  Tus chats guardados aparecerán aquí.
                </p>
              )}
              {chats.map((ch) => (
                <div
                  key={ch.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openChat(ch)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openChat(ch);
                    }
                  }}
                  className={`w-full text-left rounded-md p-2 hover:bg-sidebar-accent transition-colors cursor-pointer ${
                    view.kind === 'chat' && view.chat.id === ch.id
                      ? 'bg-sidebar-accent'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarImage
                        src={ch.character?.avatar || undefined}
                        alt={ch.character?.name || ''}
                      />
                      <AvatarFallback className="text-[10px]">
                        {(ch.character?.name || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate font-medium">{ch.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ch.character?.name}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({
                          type: 'chat',
                          id: ch.id,
                          title: ch.title,
                        });
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'gallery' && (
            <div className="space-y-1">
              {gallery.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 px-3">
                  Nadie ha publicado personajes todavía. ¡Sé el primero!
                </p>
              )}
              {gallery
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(search.toLowerCase()) ||
                    (c.tags || '').toLowerCase().includes(search.toLowerCase()),
                )
                .map((c) => (
                  <CharacterRow
                    key={c.id}
                    c={c}
                    showAuthor
                    onOpen={() => setView({ kind: 'character', character: c })}
                    active={
                      view.kind === 'character' && view.character.id === c.id
                    }
                  />
                ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setView({ kind: 'home' })}
          >
            <Home className="w-4 h-4 mr-2" />
            Inicio
          </Button>
          <AuthBar />
        </div>
      </aside>

      {/* Mobile top tabs */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b px-2 py-2 flex gap-1">
        <TabBtn
          active={tab === 'mine'}
          onClick={() => setTab('mine')}
          icon={<Users className="w-3.5 h-3.5" />}
          label="Míos"
          full
        />
        <TabBtn
          active={tab === 'chats'}
          onClick={() => setTab('chats')}
          icon={<MessageSquare className="w-3.5 h-3.5" />}
          label="Chats"
          full
        />
        <TabBtn
          active={tab === 'gallery'}
          onClick={() => setTab('gallery')}
          icon={<Globe className="w-3.5 h-3.5" />}
          label="Galería"
          full
        />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col pt-12 md:pt-0">
        {view.kind === 'home' && (
          <HomeView
            authenticated={isAuthenticated}
            onCreate={() => setView({ kind: 'create' })}
          />
        )}

        {view.kind === 'create' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <header className="max-w-3xl mx-auto mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Crear personaje
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Describe brevemente quién es tu personaje y deja que la IA
                rellene el resto, o completa los campos manualmente.
              </p>
            </header>
            <CharacterForm
              onSubmit={createCharacter}
              onCancel={() => setView({ kind: 'home' })}
              submitLabel="Crear personaje"
            />
          </div>
        )}

        {view.kind === 'edit' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <header className="max-w-3xl mx-auto mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Editar personaje
              </h1>
            </header>
            <CharacterForm
              initial={{
                name: view.character.name,
                description: view.character.description,
                physicalDescription: view.character.physicalDescription || '',
                psychologicalDescription:
                  view.character.psychologicalDescription || '',
                scenario: view.character.scenario || '',
                greeting: view.character.greeting || '',
                avatar: view.character.avatar || '',
                creatorName: view.character.creatorName || '',
                tags: view.character.tags || '',
                visibility: view.character.visibility,
              }}
              onSubmit={(d) => updateCharacter(view.character.id, d)}
              onCancel={() =>
                setView({ kind: 'character', character: view.character })
              }
              submitLabel="Guardar cambios"
            />
          </div>
        )}

        {view.kind === 'character' && (
          <CharacterDetail
            c={view.character}
            onEdit={() => setView({ kind: 'edit', character: view.character })}
            onDelete={() =>
              setConfirmDelete({
                type: 'character',
                id: view.character.id,
                name: view.character.name,
              })
            }
            onPublish={() => togglePublish(view.character)}
            onChat={() => {
              setChatNameValue(`Chat con ${view.character.name}`);
              setChatNamePrompt(view.character);
            }}
            loading={loading}
          />
        )}

        {view.kind === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <header className="border-b px-4 py-2 flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setView({
                    kind: 'character',
                    character: view.chat.character || ({} as Character),
                  })
                }
              >
                <Home className="w-4 h-4" />
              </Button>
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage
                  src={view.chat.character?.avatar || undefined}
                  alt={view.chat.character?.name || ''}
                />
                <AvatarFallback className="text-[10px]">
                  {(view.chat.character?.name || '?')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 group/title">
                {renamingChatId === view.chat.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const t = renameValue.trim();
                      if (t) renameChat(view.chat.id, t);
                      setRenamingChatId(null);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => setRenamingChatId(null)}
                      className="h-7 text-sm py-0"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameValue(view.chat.title);
                      setRenamingChatId(view.chat.id);
                    }}
                    className="text-left flex items-center gap-1 max-w-full group/edit"
                    title="Click para renombrar"
                  >
                    <p className="text-sm font-medium truncate">
                      {view.chat.title}
                    </p>
                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      · {view.chat.character?.name}
                    </span>
                  </button>
                )}
              </div>
            </header>
            <ChatView
              messages={view.chat.messages || []}
              characterName={view.chat.character?.name || 'Personaje'}
              characterAvatar={view.chat.character?.avatar}
              onSend={sendMessage}
              onEdit={editMessage}
              onDelete={deleteMessage}
              onRewind={rewindMessage}
              sending={sending}
            />
          </div>
        )}
      </main>

      {/* Mobile bottom action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t p-2 flex gap-2 items-center">
        <Button
          className="flex-1"
          size="sm"
          disabled={!isAuthenticated}
          onClick={() => {
            if (isAuthenticated) setView({ kind: 'create' });
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuevo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView({ kind: 'home' })}
        >
          <Home className="w-4 h-4" />
        </Button>
        <div className="shrink-0">
          <AuthBar compact />
        </div>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === 'character'
                ? `Se eliminará el personaje "${confirmDelete.name}" y todos sus chats. Esta acción no se puede deshacer.`
                : `Se eliminará el chat "${confirmDelete?.title}" y todos sus mensajes.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDelete) return;
                if (confirmDelete.type === 'character')
                  deleteCharacter(confirmDelete.id);
                else deleteChat(confirmDelete.id);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!chatNamePrompt}
        onOpenChange={(o) => {
          if (!o) {
            setChatNamePrompt(null);
            setChatNameValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nombre del chat</DialogTitle>
            <DialogDescription>
              Ponle un nombre a tu conversación con{' '}
              {chatNamePrompt?.name}. Podrás renombrarlo más tarde haciendo
              clic en el título del chat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="chat-name" className="sr-only">
              Nombre del chat
            </Label>
            <Input
              id="chat-name"
              autoFocus
              value={chatNameValue}
              onChange={(e) => setChatNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (chatNamePrompt) {
                    startChat(chatNamePrompt, chatNameValue);
                    setChatNamePrompt(null);
                    setChatNameValue('');
                  }
                }
              }}
              placeholder={`Chat con ${chatNamePrompt?.name || ''}`}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setChatNamePrompt(null);
                setChatNameValue('');
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                if (chatNamePrompt) {
                  startChat(chatNamePrompt, chatNameValue);
                  setChatNamePrompt(null);
                  setChatNameValue('');
                }
              }}
            >
              {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Empezar chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  full,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-md transition-colors ${
        full ? 'flex-1 justify-center' : ''
      } ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CharacterRow({
  c,
  onOpen,
  active,
  showAuthor,
}: {
  c: Character;
  onOpen: () => void;
  active: boolean;
  showAuthor?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`w-full text-left rounded-md p-2 hover:bg-sidebar-accent transition-colors flex items-center gap-2 cursor-pointer ${
        active ? 'bg-sidebar-accent' : ''
      }`}
    >
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarImage src={c.avatar || undefined} alt={c.name} />
        <AvatarFallback className="text-xs">
          {c.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium truncate">{c.name}</p>
          {c.visibility === 'public' ? (
            <Globe2
              className="w-3 h-3 text-muted-foreground shrink-0"
              aria-label="Público"
            />
          ) : (
            <Lock
              className="w-3 h-3 text-muted-foreground shrink-0"
              aria-label="Privado"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {showAuthor && (c.creatorName || c.user?.name)
            ? `por ${c.creatorName || c.user?.name}`
            : c.description}
        </p>
      </div>
    </div>
  );
}

function HomeView({
  onCreate,
  authenticated,
}: {
  onCreate: () => void;
  authenticated: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary mb-6">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Crea personajes ficticios y habla con ellos
        </h1>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Describe quién es tu personaje y la IA generará su personalidad, su
          apariencia y su escenario. Luego podrás chatear sin censuras, editar
          mensajes, rebobinar la historia y guardar tus personajes en privado
          o publicarlos en la galería.
        </p>
        {authenticated ? (
          <Button size="lg" onClick={onCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Crear mi primer personaje
          </Button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-md border bg-card text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            Inicia sesión en la barra lateral para empezar a crear personajes.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-12 text-left">
          <Feature
            icon={<Sparkles className="w-4 h-4" />}
            title="Generación con IA"
            desc="Describe a tu personaje y deja que la IA rellene los detalles."
          />
          <Feature
            icon={<MessageCircle className="w-4 h-4" />}
            title="Chat sin censuras"
            desc="Habla de lo que quieras. Usa *asteriscos* para acciones."
          />
          <Feature
            icon={<Globe2 className="w-4 h-4" />}
            title="Privado o público"
            desc="Guarda tus personajes en privado o publícalos en la galería."
          />
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-secondary mb-2">
        {icon}
      </div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function CharacterDetail({
  c,
  onEdit,
  onDelete,
  onPublish,
  onChat,
  loading,
}: {
  c: Character;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onChat: () => void;
  loading: boolean;
}) {
  const tags = (c.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <Avatar className="w-32 h-32 rounded-2xl shrink-0">
            <AvatarImage src={c.avatar || undefined} alt={c.name} />
            <AvatarFallback className="text-2xl rounded-2xl">
              {c.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{c.name}</h1>
              {c.visibility === 'public' ? (
                <Badge variant="secondary" className="gap-1">
                  <Globe2 className="w-3 h-3" />
                  Público
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Lock className="w-3 h-3" />
                  Privado
                </Badge>
              )}
            </div>
            {(c.creatorName || c.user?.name) && (
              <p className="text-sm text-muted-foreground mt-1">
                por {c.creatorName || c.user?.name}
              </p>
            )}
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2 justify-center sm:justify-start">
                {tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-sm mt-3 text-muted-foreground">{c.description}</p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center sm:justify-start">
              <Button onClick={onChat} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4 mr-1" />
                )}
                Chatear
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" onClick={onPublish}>
                {c.visibility === 'public' ? (
                  <>
                    <Lock className="w-4 h-4 mr-1" />
                    Hacer privado
                  </>
                ) : (
                  <>
                    <Globe2 className="w-4 h-4 mr-1" />
                    Hacer público
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-1 text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Section title="Descripción física">
            {c.physicalDescription || 'Sin descripción física.'}
          </Section>
          <Section title="Descripción psicológica">
            {c.psychologicalDescription || 'Sin descripción psicológica.'}
          </Section>
          <Section title="Escenario inicial">
            {c.scenario || 'Sin escenario definido.'}
          </Section>
          <Section title="Mensaje de apertura">
            {c.greeting || 'Sin mensaje de apertura.'}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-xl p-4 bg-card">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{children}</p>
    </div>
  );
}
