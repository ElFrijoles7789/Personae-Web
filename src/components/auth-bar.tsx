'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, LogOut, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AuthBar({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/auth-config')
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(!!d.googleEnabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  if (status === 'loading') {
    return (
      <div
        className={
          compact
            ? 'flex items-center justify-center'
            : 'p-3 border-t flex items-center justify-center'
        }
      >
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <>
        {compact ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
            className="px-2"
          >
            <UserIcon className="w-4 h-4" />
          </Button>
        ) : (
          <div className="p-3 border-t">
            <Button className="w-full" onClick={() => setOpen(true)}>
              Iniciar sesión
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Crea una cuenta o entra con Google para guardar tus personajes y chats.
            </p>
          </div>
        )}
        <AuthDialog
          open={open}
          onOpenChange={setOpen}
          googleEnabled={googleEnabled}
        />
      </>
    );
  }

  const user = session.user;
  const initials = (user.name || user.email || '?')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={compact ? '' : 'p-3 border-t'}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center gap-2 p-2 rounded-md hover:bg-sidebar-accent transition-colors text-left ${
              compact ? 'w-auto' : 'w-full'
            }`}
          >
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={user.image || undefined} alt={user.name || ''} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {!compact && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {user.name || 'Sin nombre'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="truncate">
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              signOut({ callbackUrl: '/' });
              toast({ title: 'Sesión cerrada' });
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AuthDialog({
  open,
  onOpenChange,
  googleEnabled,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  googleEnabled: boolean;
}) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      if (tab === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error');
        // auto-login after register
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });
        if (result?.error) throw new Error('No se pudo iniciar sesión tras el registro');
        toast({ title: 'Cuenta creada' });
        onOpenChange(false);
        resetForm();
      } else {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          throw new Error('Email o contraseña incorrectos');
        }
        toast({ title: 'Sesión iniciada' });
        onOpenChange(false);
        resetForm();
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : '',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setEmail('');
    setPassword('');
    setName('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acceder a tu cuenta</DialogTitle>
          <DialogDescription>
            Inicia sesión para crear y guardar personajes, chatear y publicar en la galería.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Crear cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-3 mt-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                icon={<Mail className="w-4 h-4" />}
                placeholder="tu@email.com"
              />
              <Field
                id="password"
                label="Contraseña"
                type="password"
                value={password}
                onChange={setPassword}
                icon={<Lock className="w-4 h-4" />}
                placeholder="••••••••"
              />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Entrar
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-3 mt-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field
                id="name"
                label="Nombre (opcional)"
                type="text"
                value={name}
                onChange={setName}
                icon={<UserIcon className="w-4 h-4" />}
                placeholder="Tu nombre"
              />
              <Field
                id="email-reg"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                icon={<Mail className="w-4 h-4" />}
                placeholder="tu@email.com"
              />
              <Field
                id="password-reg"
                label="Contraseña (mínimo 6 caracteres)"
                type="password"
                value={password}
                onChange={setPassword}
                icon={<Lock className="w-4 h-4" />}
                placeholder="••••••••"
              />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Crear cuenta
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {googleEnabled && (
          <>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">o</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: '/' })}
              disabled={busy}
            >
              <GoogleIcon className="w-4 h-4 mr-2" />
              Continuar con Google
            </Button>
          </>
        )}

        {!googleEnabled && (
          <DialogFooter className="sm:justify-center">
            <p className="text-xs text-muted-foreground text-center">
              El login con Google está desactivado en este entorno (falta
              configurar GOOGLE_CLIENT_ID). Usa email y contraseña.
            </p>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  icon,
  placeholder,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="relative mt-1">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
          autoComplete={type === 'password' ? 'current-password' : type}
        />
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.35 11.1H12v3.2h5.35c-.23 1.5-.93 2.77-1.94 3.62v3h3.13c1.83-1.69 2.88-4.18 2.88-7.13 0-.69-.06-1.36-.18-2z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.13-2.43c-.87.58-1.97.93-3.48.93-2.69 0-4.97-1.81-5.78-4.24H3l-.04 2.41A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.22 13.83a6 6 0 0 1 0-3.66V7.76H3a10 10 0 0 0 0 8.48l3.22-2.41z"
      />
      <path
        fill="#EA4335"
        d="M12 6.4c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.95 3.45 14.7 2.5 12 2.5A10 10 0 0 0 3 7.76l3.22 2.41C7.03 8.21 9.31 6.4 12 6.4z"
      />
    </svg>
  );
}
