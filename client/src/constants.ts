import type { GameId } from './types';

export const DEFAULT_CATEGORIES = [
  'Nombre o Apodo',
  'País, Ciudad o Lugar',
  'Animal',
  'Fruta o Comida',
  'Cosa u Objeto',
  'Color o Marca'
];

export const QUICK_EMOJIS = ['😂', '🔥', '👏', '🛑', '😱', '💣', '❤️', '🍍', '🎨', '🤐'];

export interface GameDefinition {
  id: GameId;
  name: string;
  emoji: string;
  category: 'Palabras' | 'Dibujo' | 'Social' | 'Velocidad';
  tagline: string;
  description: string;
  howToPlay: string[];
  recommendedPlayers: string;
  borderActiveColor: string;
  gradientBg: string;
}

export const ALL_GAMES: GameDefinition[] = [
  {
    id: 'tutifruti',
    name: 'Tutti Frutti / Basta / Stop',
    emoji: '🍍',
    category: 'Palabras',
    tagline: '¡Piensa rápido con la letra elegida y canta STOP!',
    description: 'Completa categorías con la letra de la ronda. Cuenta con sirena de STOP, votación de duplicados y podio.',
    howToPlay: [
      'Se sortea una letra al azar para la ronda.',
      'Escribe una palabra válida para cada categoría que empiece con esa letra.',
      'El primero en completar presiona ¡BASTA! (quedan solo 3 segundos para el resto).',
      'Palabras únicas valen +10 pts, repetidas +5 pts y vacías 0 pts.'
    ],
    recommendedPlayers: '2 - 12 jugadores',
    borderActiveColor: 'border-amber-400',
    gradientBg: 'from-amber-500/20 via-pink-500/20 to-indigo-500/20'
  },
  {
    id: 'gartic',
    name: 'Teléfono Descompuesto (Gartic)',
    emoji: '🎨',
    category: 'Dibujo',
    tagline: 'Escribe una frase, dibuja la de tu amigo y adivina el dibujo.',
    description: 'Cadena de teléfono descompuesto con lienzo táctil. Al final, presentación hilarante de cómo mutó cada frase.',
    howToPlay: [
      'Cada jugador empieza escribiendo una frase creativa o disparatada.',
      'Le pasas la frase al siguiente jugador para que la dibuje en su pantalla.',
      'El siguiente debe adivinar con texto qué representa ese dibujo.',
      'Al terminar los pasos, se presenta el álbum completo de cómo mutó la historia.'
    ],
    recommendedPlayers: '3 - 10 jugadores',
    borderActiveColor: 'border-sky-400',
    gradientBg: 'from-sky-500/20 via-blue-500/20 to-purple-500/20'
  },
  {
    id: 'hivemind',
    name: 'Mente Colectiva (Hivemind)',
    emoji: '👥',
    category: 'Social',
    tagline: '¡No seas original! Piensa exactamente igual que la mayoría.',
    description: 'Responde preguntas de cultura popular intentando coincidir con tus amigos. ¡Los que coincidan suman puntos!',
    howToPlay: [
      'Aparece una pregunta abierta (ej: "Un sabor de helado tradicional").',
      'Escribe la respuesta que creas que pondrán la mayoría de tus amigos.',
      'No intentes ser original ni creativo: el objetivo es coincidir.',
      'Las respuestas más votadas por el grupo se llevan +10 o +5 puntos.'
    ],
    recommendedPlayers: '3 - 12 jugadores',
    borderActiveColor: 'border-teal-400',
    gradientBg: 'from-teal-500/20 via-emerald-500/20 to-indigo-500/20'
  },
  {
    id: 'mostlikely',
    name: '¿Quién es Más Probable Que...?',
    emoji: '⚖️',
    category: 'Social',
    tagline: 'Frases creadas por ustedes mismos + votación de sospechosos.',
    description: 'Cada jugador escribe preguntas picantes antes de empezar. Luego todos votan en secreto a quién describe mejor.',
    howToPlay: [
      'Antes de empezar, cada jugador escribe una pregunta divertida o picante.',
      'El juego mezcla todas las frases y las va mostrando una por una.',
      'Todos votan en secreto por cuál de los amigos de la sala encaja mejor.',
      'Se revela quién votó a quién y quién fue el "ganador" con más votos.'
    ],
    recommendedPlayers: '3 - 12 jugadores',
    borderActiveColor: 'border-rose-400',
    gradientBg: 'from-rose-500/20 via-pink-500/20 to-amber-500/20'
  },
  {
    id: 'fibbage',
    name: 'Cazador de Mentiras (Bluff)',
    emoji: '🎭',
    category: 'Social',
    tagline: 'Inventa mentiras creíbles y engaña a todos tus amigos.',
    description: 'Una trivia insólita incompleta. Engaña a los demás con tu mentira y descubre la verdad para sumar puntos.',
    howToPlay: [
      'Aparece un dato real y bizarro de la historia o cultura con un espacio en blanco.',
      'Inventa una mentira convincente para rellenar el espacio.',
      'Se muestran todas las opciones: la verdad real + los engaños de todos.',
      'Ganas puntos si descubres la verdad (+10 pts) o si tus amigos caen en tu mentira (+5 pts).'
    ],
    recommendedPlayers: '3 - 10 jugadores',
    borderActiveColor: 'border-violet-400',
    gradientBg: 'from-violet-500/20 via-purple-500/20 to-pink-500/20'
  },
  {
    id: 'fiveseconds',
    name: '5 Segundos (5 Second Rule)',
    emoji: '⏱️',
    category: 'Velocidad',
    tagline: '¡Nombra 3 cosas antes de que el reloj marque cero!',
    description: 'Turnos contrarreloj ultrarrápidos con cronómetro de 5s y votación en vivo de tus amigos si respondiste a tiempo.',
    howToPlay: [
      'Un jugador queda en el banquillo con un desafío en pantalla.',
      'Tiene un cronómetro de 5 segundos para nombrar 3 cosas en voz alta.',
      'El resto de los amigos vota en vivo si respondió bien y a tiempo.',
      'Si la mayoría aprueba, suma +10 puntos para la tabla general.'
    ],
    recommendedPlayers: '2 - 12 jugadores',
    borderActiveColor: 'border-orange-400',
    gradientBg: 'from-orange-500/20 via-amber-500/20 to-red-500/20'
  },
  {
    id: 'taboo',
    name: 'Tabú (Palabras Prohibidas)',
    emoji: '🤐',
    category: 'Palabras',
    tagline: 'Haz que adivinen la palabra sin pronunciar las prohibidas.',
    description: 'Tienes 60 segundos para describir tarjetas. Tus amigos actúan de árbitros para que no digas las palabras tabú.',
    howToPlay: [
      'El jugador activo debe hacer que su grupo adivine la palabra principal.',
      '¡PROHIBIDO decir las 5 palabras tabú en rojo o partes de la palabra!',
      'Los demás jugadores ven las palabras tabú como árbitros vigilando.',
      'Tienes 60 segundos para acertar tantas tarjetas como sea posible (+1 pt c/u).'
    ],
    recommendedPlayers: '3 - 12 jugadores',
    borderActiveColor: 'border-emerald-400',
    gradientBg: 'from-emerald-500/20 via-teal-500/20 to-cyan-500/20'
  },
  {
    id: 'impostor',
    name: 'El Impostor',
    emoji: '🕵️',
    category: 'Social',
    tagline: 'Todos conocen la palabra secreta excepto uno. ¡Atrápenlo!',
    description: 'Deducción social, pistas sutiles, tarjetas secretas y votación para atrapar al impostor antes de que adivine la palabra.',
    howToPlay: [
      'Todos reciben la misma palabra secreta en su pantalla, excepto el Impostor.',
      'Por turnos, cada jugador dice una pista en voz alta (ni muy obvia ni muy críptica).',
      'Discuten y votan en secreto quién creen que es el impostor.',
      'Si lo descubren, ¡el impostor tiene un último intento de adivinar la palabra y ganar!'
    ],
    recommendedPlayers: '3 - 12 jugadores',
    borderActiveColor: 'border-purple-400',
    gradientBg: 'from-purple-500/20 to-indigo-500/20'
  },
  {
    id: 'bomba',
    name: 'La Bomba de Palabras',
    emoji: '💣',
    category: 'Velocidad',
    tagline: '¡Di una palabra con la sílaba antes de que estalle!',
    description: 'La bomba pasa de jugador a jugador con mecha corta. 3 corazones de vida por jugador.',
    howToPlay: [
      'La bomba le toca a un jugador con una sílaba (ej: "PAR").',
      'Escribe rápido una palabra que contenga esa sílaba para pasarle la bomba a otro.',
      'El tiempo de la mecha es aleatorio y se acelera.',
      'A quien le explote pierde 1 corazón. ¡El último con vidas gana!'
    ],
    recommendedPlayers: '2 - 12 jugadores',
    borderActiveColor: 'border-red-400',
    gradientBg: 'from-red-500/20 to-orange-500/20'
  }
];
