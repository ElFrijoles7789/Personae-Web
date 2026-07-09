# Personae

Crea personajes ficticios con IA, chatea sin censuras, edita mensajes, rebobina, sube avatares y publica en la galería.

## Funcionalidades

- 🎭 Crear personajes con generación IA (descripción → ficha completa automática)
- 💬 Chat con IA sin censuras (sigue el rol, no provoca)
- ✏️ Editar, copiar, rebobinar y borrar mensajes
- 🔒 Personajes privados o públicos (galería comunitaria)
- 🌐 Galería de personajes públicos
- 🌍 6 idiomas (Español, Inglés, Portugués, Francés, Italiano, Alemán)
- 🌙 Tema oscuro/claro/sistema
- 🔊 Leer mensajes en voz alta (detecta el idioma automáticamente)
- ⭐ Likes, favoritos y comentarios
- 🔐 Sistema de cuentas (email + Google OAuth opcional)

## Requisitos

- Node.js 20+ o Bun
- SQLite (incluido, no necesitas instalar nada)

## Instalación

```bash
# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env
# Edita .env y añade tu NEXTAUTH_SECRET (genera uno con: openssl rand -base64 32)

# Crear la base de datos
bun run db:push

# Iniciar el servidor
bun run dev
```

Abre http://localhost:3000 en tu navegador.

## Despliegue

### Render.com (gratis)

1. Sube este proyecto a GitHub
2. Entra en https://render.com y crea una cuenta
3. New → Web Service → conecta tu repo de GitHub
4. Configuración:
   - Build Command: `bun install && bun run db:push`
   - Start Command: `bun run dev`
   - Añade un disco persistente de 1GB en `/opt/render/project/src/db`
5. Añade las variables de entorno:
   - `DATABASE_URL=file:/opt/render/project/src/db/custom.db`
   - `NEXTAUTH_SECRET=tu-secreto`
   - `NEXTAUTH_URL=https://tu-app.onrender.com`
6. Deploy

### VPS (DigitalOcean, Hetzner, etc.)

```bash
git clone https://github.com/tu-usuario/personae.git
cd personae
bun install
cp .env.example .env  # edita .env
bun run db:push
bun run dev
```

## Google OAuth (opcional)

1. Ve a https://console.cloud.google.com/apis/credentials
2. Crea un "OAuth 2.0 Client ID" tipo Web
3. Añade tu URL en "Authorized redirect URIs": `https://tu-dominio.com/api/auth/callback/google`
4. Copia Client ID y Secret a tu `.env`

## Licencia

MIT
