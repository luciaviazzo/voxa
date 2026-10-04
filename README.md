# Voxa

**Tus finanzas, con solo hablar.**

Voxa es una aplicación de finanzas personales pensada para adultos mayores. Llevar las cuentas del día a día suele implicar planillas, botones pequeños y formularios largos. Voxa lo reemplaza por algo mucho más natural: contarle a la app lo que pasó con la plata, con la propia voz.

---

## El problema

Muchas personas mayores quieren tener control de sus gastos, pero las aplicaciones tradicionales les resultan complicadas: demasiados pasos, textos chicos, menús que cuesta entender. El resultado es que terminan sin registrar nada, o dependiendo de otra persona para hacerlo.

## La solución

Con Voxa alcanza con mantener presionado un botón grande y decir, por ejemplo:

> "Gasté 8500 en la farmacia"

La app entiende lo que se dijo, identifica el monto, si fue un gasto o un ingreso y de qué categoría se trata, y actualiza el saldo disponible. Sin escribir, sin formularios, sin pasos de más.

---

## Cómo funciona

1. **Hablás.** Mantenés presionado el botón del micrófono y contás tu gasto o ingreso.
2. **Voxa escucha.** El audio se convierte en texto.
3. **Voxa entiende.** De ese texto se extraen el monto, el tipo de movimiento y la categoría.
4. **Tu saldo se actualiza.** El movimiento queda registrado y ves cuánto dinero te queda.

---

## Pensada para quienes más lo necesitan

- **Un solo botón principal.** La pantalla se centra en lo esencial, sin menús ni opciones que distraigan.
- **Mensajes claros y en español rioplatense**, con indicaciones simples en cada paso ("Mantené presionado para hablar").
- **Cero escritura.** Todo se hace hablando de manera natural, como si se le contara a un familiar.
- **Elementos grandes y fáciles de tocar.**

---

## Qué tiene el proyecto

Voxa se compone de dos partes:

- **La aplicación móvil**, que es lo que usa la persona: la pantalla con el botón de grabación y el saldo.
- **El servidor**, que recibe el audio, lo transcribe y entiende qué movimiento se mencionó.

```
voxa/
├── frontend/   → la app del celular
└── backend/    → el servidor que procesa la voz
```

Por debajo se apoya en modelos de inteligencia artificial de [Groq](https://groq.com) para transcribir el audio y extraer los datos del movimiento.

---

## Cómo probarlo

Necesitás Node.js 18 o superior, una API key gratuita de [Groq](https://console.groq.com) y la app Expo Go en el celular.

**1. Servidor**

```bash
cd backend
npm install
```

Creá el archivo `backend/.env.local` con tu clave:

```
GROQ_API_KEY=tu_api_key_de_groq
```

Y levantalo:

```bash
npm run dev
```

Con el servidor corriendo, la documentación interactiva de la API (Swagger) queda disponible en:

| Recurso | URL |
|---|---|
| Swagger UI | `http://localhost:3000/api/docs` |
| Especificación OpenAPI (JSON) | `http://localhost:3000/api/openapi` |

**2. Aplicación**

```bash
cd frontend
npm install
npm start
```

Escaneá el código QR con Expo Go. Para que el celular encuentre al servidor, configurá la dirección de tu computadora en `frontend/src/services/api.ts`.

---

## Para desarrolladores

Detalle técnico de la API y de los tests.

### Documentación interactiva (Swagger)

Swagger UI en `/api/docs` y especificación OpenAPI en `/api/openapi`. El spec se define en `backend/lib/docs/openapi.ts` y hay que actualizarlo a mano si cambia la API.

### Endpoint `POST /api/transcribe`

Recibe un archivo de audio (`multipart/form-data`, campo `audio`, máximo 25 MB) y devuelve el texto y los datos del movimiento:

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

| Status | Significado |
|---|---|
| `400` | Audio ausente, vacío o de un tipo no válido |
| `413` | Archivo mayor a 25 MB |
| `422` | No se pudo transcribir el audio |
| `429` | Se superó el límite de uso de Groq |
| `500` | Error interno |

### Tests

Ambos proyectos exigen 100% de cobertura (líneas, ramas, funciones y sentencias): si algo queda sin testear, `test:coverage` falla.

```bash
cd backend && npm run test:coverage    # 42 tests
cd frontend && npm run test:coverage   # 59 tests
```

| Proyecto | Unitarios | End-to-end |
|---|---|---|
| Backend | Servicio de transcripción, endpoint, Swagger/OpenAPI | `e2e/transcribe.e2e.test.ts`: route + servicio + cliente real contra un Groq simulado por HTTP |
| Frontend | Cliente HTTP, servicio de transcripción, botón de grabación, pantalla principal, layout y pantalla 404 | `__tests__/HomeScreen.e2e.test.tsx`: de la voz al saldo, con pantalla, botón, servicio y cliente HTTP reales |

Los tests end-to-end no usan la API real de Groq ni el micrófono real: reemplazan solo esos bordes. La prueba en un celular físico con Expo Go sigue siendo manual.

### Tecnologías

React Native con Expo y NativeWind en la app; Next.js en el servidor, organizado por capas (HTTP, lógica de negocio y clientes externos); Whisper y Llama vía Groq; Jest para los tests.
