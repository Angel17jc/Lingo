export const messages = {
  meta: {
    title: "Lingo — Tus ideas, en otro idioma",
    description:
      "Un espacio sencillo para traducir, conectar y encontrar las palabras. Traduce entre idiomas con Lingo.",
  },
  brand: "Lingo",
  skip: "Ir al traductor",
  navigation: {
    translator: "Traductor",
    how: "Cómo funciona",
    note: "Sin cuenta. A tu ritmo.",
  },
  theme: { light: "Activar modo claro", dark: "Activar modo oscuro" },
  hero: {
    greeting: "Hola",
    eyebrow: "UN MUNDO MÁS CERCA",
    title: "Tus ideas,",
    emphasis: "en otro idioma.",
    description: "Cambia de idioma. Mantén lo que quieres decir.",
    badge: "Las palabras abren puertas.",
  },
  form: {
    title: "Tu espacio para traducir",
    source: "Idioma de origen",
    target: "Idioma de destino",
    from: "DE",
    to: "A",
    detect: "Detectar idioma",
    input: "Texto para traducir",
    output: "Traducción",
    inputPlaceholder: "Escribe o pega aquí lo que quieras decir…",
    outputPlaceholder: "Las palabras correctas\nempiezan aquí.",
    outputHint: "Tu traducción aparecerá en este espacio.",
    clear: "Borrar texto",
    copy: "Copiar traducción",
    copied: "Copiado",
    copyAction: "Copiar",
    copyFailed:
      "No pudimos copiar el texto. Puedes seleccionarlo y copiarlo manualmente.",
    swap: "Intercambiar idiomas",
    swapNeedsSource:
      "Elige un idioma de origen o traduce primero para poder intercambiar.",
    swapUnsupported:
      "El idioma detectado todavía no está disponible en los selectores.",
    swapTooLong:
      "La traducción supera el límite de entrada. Copia el fragmento que quieras volver a traducir.",
    swapped: "Idiomas intercambiados. Ya puedes volver a traducir.",
    translate: "Traducir",
    translating: "Traduciendo…",
    loadingTitle: "Buscando las palabras…",
    loadingHint: "Tu traducción está en camino.",
    done: "Traducción lista",
    idle: "Un idioma distinto. La misma idea.",
    provider: "Traducción con DeepL",
    shortcut: "Ctrl / ⌘ + Enter",
    privacy: "Al traducir, tu texto se envía a DeepL para procesarse.",
    examplesLabel: "¿Por dónde empezamos?",
    examplePrefix: "Probar ejemplo:",
    examples: [
      {
        label: "Un correo de trabajo",
        text: "Hola, equipo. Gracias por vuestro trabajo. ¿Podemos reunirnos mañana para revisar los próximos pasos?",
      },
      {
        label: "Mi próximo viaje",
        text: "¡Hola! Me gustaría reservar una mesa para dos personas junto a la ventana. Muchas gracias.",
      },
      {
        label: "Algo bonito que decir",
        text: "A veces, las palabras más sencillas son las que más nos acercan. Gracias por estar aquí.",
      },
    ],
    count: (length: number, limit: number) =>
      `${length.toLocaleString("es")} / ${limit.toLocaleString("es")}`,
    countAccessible: (length: number, limit: number) =>
      `${length} de ${limit} caracteres`,
    detected: (language: string) => `Detectado: ${language}`,
    readyAnnouncement: (text: string) => `Traducción lista: ${text}`,
    retry: (seconds: number) => `Reintentar en ${seconds} s`,
  },
  errors: {
    empty: "Escribe algo para empezar a traducir.",
    tooLong:
      "Tu texto supera el límite de 3000 caracteres. Prueba con un fragmento más corto.",
    invalid: "Revisa el texto y los idiomas seleccionados.",
    network: "No pudimos conectar. Comprueba tu conexión e inténtalo de nuevo.",
    provider:
      "El servicio de traducción no está disponible ahora. Prueba de nuevo en un momento.",
    quota:
      "Hemos alcanzado la cuota de traducción disponible. Vuelve a intentarlo más tarde.",
    rateLimit:
      "Has realizado varias solicitudes seguidas. Espera a que termine la cuenta atrás.",
    retryReady: "Ya puedes volver a intentarlo.",
    unexpected: "No pudimos completar la traducción. Inténtalo de nuevo.",
  },
  how: {
    eyebrow: "ASÍ DE SENCILLO",
    title: "Menos pasos. Más conversaciones.",
    steps: [
      {
        number: "01",
        title: "Dale espacio a tu idea",
        description:
          "Pega un mensaje, escribe una frase o prueba con uno de nuestros ejemplos.",
      },
      {
        number: "02",
        title: "Elige dónde quieres llegar",
        description:
          "Selecciona el idioma de destino. Nosotros podemos detectar el de origen.",
      },
      {
        number: "03",
        title: "Haz que la conversación siga",
        description:
          "Traduce, copia el resultado y llévate tus palabras a donde las necesites.",
      },
    ],
  },
  footer: {
    tagline: "Hecho para entendernos.",
    signature: "Un pequeño puente entre idiomas.",
  },
} as const;
