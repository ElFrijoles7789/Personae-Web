'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mic, Upload, Trash2, Check, AudioLines, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceModel {
  id: string;
  name: string;
  status: string;
  voiceId: string;
  samples: string;
  totalDurationSec: number;
  _count?: { characters: number };
  createdAt: string;
}

interface Voice {
  id: string;
  label: string;
}

export function VoiceModelManager({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}) {
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/voice-models');
      const json = await res.json();
      setVoiceModels(json.voiceModels || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function createModel() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/voice-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setNewName('');
      await load();
      toast({ title: 'Modelo de voz creado' });
      onCreated?.();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function deleteModel(id: string) {
    const res = await fetch(`/api/voice-models/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await load();
      onCreated?.();
      toast({ title: 'Modelo eliminado' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Modelos de voz
          </DialogTitle>
          <DialogDescription>
            Sube audios limpios de unos minutos y elige la voz que más se parezca. Podrás aplicar el modelo a cualquiera de tus personajes para leer mensajes en voz alta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del modelo (ej: Mi voz grave)"
              onKeyDown={(e) => { if (e.key === 'Enter') createModel(); }}
            />
            <Button onClick={createModel} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mic className="w-4 h-4 mr-1" />}
              Crear
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : voiceModels.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Mic className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Aún no tienes modelos de voz. Crea uno para empezar.
            </div>
          ) : (
            <div className="space-y-3">
              {voiceModels.map((vm) => (
                <VoiceModelCard key={vm.id} vm={vm} onChanged={load} onDelete={() => deleteModel(vm.id)} onReady={onCreated} />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoiceModelCard({
  vm,
  onChanged,
  onDelete,
  onReady,
}: {
  vm: VoiceModel;
  onChanged: () => void;
  onDelete: () => void;
  onReady?: () => void;
}) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(vm.voiceId);
  const [playingSample, setPlayingSample] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const samples = vm.samples ? vm.samples.split(',').filter(Boolean) : [];
  const isReady = vm.status === 'ready';
  const minutes = Math.floor(vm.totalDurationSec / 60);
  const secs = vm.totalDurationSec % 60;

  useEffect(() => {
    fetch('/api/voice-models/' + vm.id + '/train')
      .then((r) => r.json())
      .then((d) => setVoices(d.voices || []))
      .catch(() => {});
  }, [vm.id]);

  async function uploadSample(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Read actual audio duration using HTML5 Audio API
      const durationSec = await new Promise<number>((resolve) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          const d = audio.duration;
          resolve(isFinite(d) && d > 0 ? Math.round(d) : 0);
        };
        audio.onerror = () => resolve(0);
        audio.src = URL.createObjectURL(file);
      });

      const fd = new FormData();
      fd.append('file', file);
      fd.append('durationSec', String(durationSec));
      const res = await fetch(`/api/voice-models/${vm.id}/samples`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      onChanged();
      const newSecs = json.estimatedSec || durationSec;
      toast({ title: 'Audio subido', description: `+${newSecs}s de audio` });
    } catch (e) {
      toast({ title: 'Error al subir', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function train() {
    setTraining(true);
    try {
      const res = await fetch(`/api/voice-models/${vm.id}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: selectedVoice }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      onChanged();
      onReady?.();
      toast({ title: '¡Modelo entrenado y listo!' });
    } catch (e) {
      toast({ title: 'No se pudo entrenar', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setTraining(false);
    }
  }

  function playSample(url: string) {
    if (playingSample === url) {
      audioRef.current?.pause();
      setPlayingSample(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audio.onended = () => setPlayingSample(null);
    audio.play();
    audioRef.current = audio;
    setPlayingSample(url);
  }

  return (
    <div className={`border rounded-lg p-3 ${isReady ? 'border-primary/40 bg-primary/5' : 'bg-card'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{vm.name}</p>
            {isReady ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                <Check className="w-2.5 h-2.5" /> Listo
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                Borrador
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {samples.length} audios · {minutes}m {secs}s
            {vm._count?.characters ? ` · ${vm._count.characters} personajes` : ''}
          </p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <input ref={fileRef} type="file" accept="audio/*" onChange={uploadSample} className="hidden" />
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading || isReady}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
          {isReady ? 'Modelo ya entrenado' : 'Subir audio limpio'}
        </Button>

        {samples.length > 0 && (
          <div className="space-y-1">
            {samples.map((url, i) => (
              <div key={url} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                <AudioLines className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">Audio {i + 1}</span>
                <button
                  type="button"
                  onClick={() => playSample(url)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {playingSample === url ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {!isReady && samples.length > 0 && (
          <div className="space-y-2 pt-1 border-t">
            <Label className="text-xs">Elige la voz que más se parezca a tus audios:</Label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" className="w-full" onClick={train} disabled={training}>
              {training ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Entrenar y activar voz
            </Button>
          </div>
        )}

        {!isReady && samples.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Sube al menos un audio limpio para poder entrenar la voz
          </p>
        )}

        {isReady && (
          <p className="text-[11px] text-primary text-center pt-1">
            Voz activa: {voices.find((v) => v.id === vm.voiceId)?.label || vm.voiceId}
          </p>
        )}
      </div>
    </div>
  );
}
