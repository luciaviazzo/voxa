# Voxa

Aplicación de finanzas personales por voz, pensada para adultos mayores. El usuario graba un audio con su gasto o ingreso del día ("gasté 8500 en la farmacia") y la app lo transcribe, extrae los datos de la transacción y actualiza el saldo disponible automáticamente.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React Native + Expo |
| Estilos | NativeWind (Tailwind CSS) |
| Audio | expo-av |
| Backend | Next.js (API Routes) |
| Transcripción | Whisper via Groq (`whisper-large-v3-turbo`) |
| Extracción de datos | Llama 3.1 via Groq (`llama-3.1-8b-instant`) |
| Tests | Jest |

---

## Arquitectura

El proyecto es un monorepo con dos aplicaciones independientes.

```
voxa/
├── backend/    → API REST en Next.js
└── frontend/   → App móvil en Expo
```

### Backend — arquitectura por capas

```
backend/
├── app/api/transcribe/     → capa HTTP (route handler)
├── services/transcription/ → lógica de negocio
└── lib/clients/            → clientes externos (OpenAI/Groq)
```

### Flujo principal

```
[Grabación de audio]
        ↓
POST /api/transcribe
        ↓
validateAudio()         → valida tipo, tamaño y contenido
        ↓
transcribeAudio()       → Whisper convierte audio a texto
        ↓
extractTransaction()    → Llama extrae monto, tipo y categoría
        ↓
{ text, transaction }   → el frontend actualiza el saldo
```

---

## Requisitos

- Node.js 18+
- Cuenta en [Groq](https://console.groq.com) (API key gratuita)
- Expo Go en el celular (o emulador)

---

## Instalación

### Backend

```bash
cd backend
npm install
```

Crear el archivo de variables de entorno:

```bash
# backend/.env.local
GROQ_API_KEY=tu_api_key_de_groq
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
# http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
```

Configurar la URL del backend en `src/services/api.ts` apuntando a tu IP local.

Iniciar la app:

```bash
npm start
# Escaneá el QR con Expo Go
```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `GROQ_API_KEY` | API key de Groq (requerida en backend) |

---

## API

### `POST /api/transcribe`

Recibe un archivo de audio y retorna el texto transcripto junto con los datos de la transacción.

**Request** — `multipart/form-data`

| Campo | Tipo | Descripción |
|---|---|---|
| `audio` | File | Archivo de audio (`audio/*`, máx. 25 MB) |

**Response `200`**

```json
{
  "text": "gasté 8500 en la farmacia",
  "transaction": {
    "monto": 8500,
    "tipo": "gasto",
    "categoria": "Salud",
    "descripcion": "Farmacia"
  }
}
```

**Errores posibles**

| Status | Descripción |
|---|---|
| `400` | Campo `audio` ausente, inválido, vacío o tipo MIME incorrecto |
| `413` | Archivo mayor a 25 MB |
| `422` | Whisper no pudo transcribir el audio |
| `429` | Rate limit de la API de Groq |
| `500` | Error interno |

---

## Tests

```bash
cd backend
npm test
```

Cobertura actual: 13 tests sobre el endpoint `/api/transcribe`.

---

## Estructura del proyecto

```
voxa/
├── backend/
│   ├── app/api/transcribe/
│   │   ├── route.ts                          # handler HTTP
│   │   └── route.test.ts                     # tests
│   ├── services/transcription/
│   │   └── transcription.service.ts          # lógica de negocio
│   ├── lib/clients/
│   │   └── openai.ts                         # cliente Groq/OpenAI
│   └── ...config files
└── frontend/
    ├── app/
    │   └── index.tsx                         # pantalla principal
    └── src/
        ├── components/RecordButton.tsx        # botón de grabación
        ├── services/
        │   ├── api.ts                         # cliente HTTP
        │   └── transcribeService.ts           # llamada al backend
        └── types/index.ts                     # tipos compartidos
```
