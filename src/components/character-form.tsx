'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Upload, X, Lock, Globe2, Mic, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface VoiceModelOption {
  id: string;
  name: string;
  voiceId: string;
}

export interface CharacterFormData {
  name: string;
  description: string;
  physicalDescription: string;
  psychologicalDescription: string;
  scenario: string;
  greeting: string;
  avatar: string;
  creatorName: string;
  tags: string;
  visibility: 'private' | 'public';
  voiceModelId: string;
}

const EMPTY: CharacterFormData = {
  name: '',
  description: '',
  physicalDescription: '',
  psychologicalDescription: '',
  scenario: '',
  greeting: '',
  avatar: '',
  creatorName: '',
  tags: '',
  visibility: 'private',
  voiceModelId: '',
};

interface Props {
  initial?: Partial<CharacterFormData>;
  onSubmit: (data: CharacterFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  voiceModels?: VoiceModelOption[];
}

export function CharacterForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
  voiceModels = [],
}: Props) {
  const [data, setData] = useState<CharacterFormData>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const set = (k: keyof CharacterFormData, v: string) =>
    setData((d) => ({ ...d, [k]: v }));

  async function generateWithAI() {
    if (data.description.trim().length < 3) {
      toast({
        title: 'Escribe una descripción primero',
        description:
          'Describe brevemente al personaje y la IA generará el resto.',
        variant: 'destructive',
      });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: data.description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error desconocido');
      const c = json.character;
      setData((d) => ({
        ...d,
        name: c.name || d.name,
        description: c.description || d.description,
        physicalDescription: c.physicalDescription || d.physicalDescription,
        psychologicalDescription:
          c.psychologicalDescription || d.psychologicalDescription,
        scenario: c.scenario || d.scenario,
        greeting: c.greeting || d.greeting,
        tags: c.tags || d.tags,
      }));
      toast({
        title: 'Personaje generado',
        description: 'Revisa y ajusta los campos antes de guardar.',
      });
    } catch (e) {
      toast({
        title: 'No se pudo generar',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Solo se permiten imágenes',
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al subir');
      set('avatar', json.url);
      toast({ title: 'Avatar subido' });
    } catch (e) {
      toast({
        title: 'Error al subir',
        description: e instanceof Error ? e.message : '',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.name.trim() || !data.description.trim()) {
      toast({
        title: 'Nombre y descripción son obligatorios',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      await onSubmit(data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 max-w-3xl mx-auto pb-24"
    >
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="w-32 h-32 rounded-2xl overflow-hidden bg-muted border border-border flex items-center justify-center">
            {data.avatar ? (
              <img
                src={data.avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-muted-foreground px-2 text-center">
                Sin avatar
              </span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Subir
            </Button>
            {data.avatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set('avatar', '')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1 w-full">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Lyra Vance"
            />
          </div>
          <div>
            <Label htmlFor="creator">Tu nombre (autor)</Label>
            <Input
              id="creator"
              value={data.creatorName}
              onChange={(e) => set('creatorName', e.target.value)}
              placeholder="Anónimo"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (separados por comas)</Label>
            <Input
              id="tags"
              value={data.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="fantasía, oscuro, romance"
            />
          </div>
          <div>
            <Label>Visibilidad</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => set('visibility', 'private')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                  data.visibility === 'private'
                    ? 'border-primary bg-secondary text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span className="text-left">
                  <span className="block font-medium">Privado</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Solo tú
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => set('visibility', 'public')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                  data.visibility === 'public'
                    ? 'border-primary bg-secondary text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe2 className="w-4 h-4 shrink-0" />
                <span className="text-left">
                  <span className="block font-medium">Público</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Visible en galería
                  </span>
                </span>
              </button>
            </div>
          </div>
          <div>
            <Label className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" />
              Modelo de voz (opcional)
            </Label>
            <Select
              value={data.voiceModelId || 'none'}
              onValueChange={(v) => set('voiceModelId', v === 'none' ? '' : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Voz por defecto (sin modelo)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Voz por defecto (sin modelo)</SelectItem>
                {voiceModels.map((vm) => (
                  <SelectItem key={vm.id} value={vm.id}>
                    {vm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Si seleccionas un modelo de voz entrenado, el chat podrá leer los mensajes en voz alta con esa voz. Puedes crear modelos en la sección "Modelos de voz" de la barra lateral.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="description">Descripción breve *</Label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={generateWithAI}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            Generar con IA
          </Button>
        </div>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          placeholder="Una bruja exiliada que busca venganza contra el reino que la traicionó..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Describe quién es. Pulsa <strong>Generar con IA</strong> para que la
          IA rellene los siguientes campos automáticamente.
        </p>
      </div>

      <div>
        <Label htmlFor="physical">Descripción física</Label>
        <Textarea
          id="physical"
          value={data.physicalDescription}
          onChange={(e) => set('physicalDescription', e.target.value)}
          rows={3}
          placeholder="Alta, cabello plateado, ojos violeta, una cicatriz en la mejilla izquierda..."
        />
      </div>

      <div>
        <Label htmlFor="psych">Descripción psicológica</Label>
        <Textarea
          id="psych"
          value={data.psychologicalDescription}
          onChange={(e) => set('psychologicalDescription', e.target.value)}
          rows={3}
          placeholder="Fría, calculadora, leal a quienes ganan su confianza, vengativa..."
        />
      </div>

      <div>
        <Label htmlFor="scenario">Escenario inicial</Label>
        <Textarea
          id="scenario"
          value={data.scenario}
          onChange={(e) => set('scenario', e.target.value)}
          rows={2}
          placeholder="Una taberna en la frontera del reino, una noche de tormenta..."
        />
      </div>

      <div>
        <Label htmlFor="greeting">Mensaje de apertura del personaje</Label>
        <Textarea
          id="greeting"
          value={data.greeting}
          onChange={(e) => set('greeting', e.target.value)}
          rows={2}
          placeholder="*levanta la vista de su copa* ¿Tú otra vez? Pensé que ya te había dicho que no molestases..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Usa <code className="bg-muted px-1 rounded">*texto*</code> entre
          asteriscos para indicar acciones físicas o narración.
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-4 sticky bottom-0 bg-background/80 backdrop-blur py-3 -mx-4 px-4 border-t">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
