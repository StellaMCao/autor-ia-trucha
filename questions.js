/**
 * BANCO DE PREGUNTAS: ¿Autor, IA o cita trucha?
 * 
 * Podés editar, eliminar, reordenar o agregar nuevas frases en esta lista.
 * No es necesario modificar la lógica del programa al cambiar este archivo.
 * 
 * Valores posibles para `correct`:
 *   - "autor"  -> Frase real de un autor humano
 *   - "ia"     -> Frase inventada por Inteligencia Artificial
 *   - "trucha" -> Cita apócrifa / atribuida falsamente
 */

window.DEFAULT_QUESTIONS = [
  {
    id: 1,
    quote: "Las convicciones son enemigos de la verdad más peligrosos que las mentiras.",
    correct: "autor",
    author: "Friedrich Nietzsche",
    explanation: "Cita atribuible a Friedrich Nietzsche en «Humano, demasiado humano» (1878), aforismo 483.",
    source: "Humano, demasiado humano (I, § 483)"
  },
  {
    id: 2,
    quote: "La certeza es la forma más cómoda que tiene la ignorancia de descansar.",
    correct: "ia",
    author: "Ninguno",
    explanation: "Frase generada íntegramente por inteligencia artificial para este juego imitando el tono aforístico clásico.",
    source: "Experimento de generación sintética"
  },
  {
    id: 3,
    quote: "El mayor enemigo del conocimiento no es la ignorancia, sino la ilusión del conocimiento.",
    correct: "trucha",
    author: "Atribuida habitualmente a Stephen Hawking (o Daniel J. Boorstin)",
    explanation: "Circula ampliamente atribuida a Stephen Hawking, pero no existe una fuente fiable en su obra que permita considerarla una cita suya (suele ser una paráfrasis popularizada por el historiador Daniel J. Boorstin).",
    source: "Quote Investigator / Archivo apócrifo"
  },
  {
    id: 4,
    quote: "Cada hombre toma los límites de su propio campo de visión por los límites del mundo.",
    correct: "autor",
    author: "Arthur Schopenhauer",
    explanation: "Cita auténtica de Arthur Schopenhauer en sus «Parerga y Paralipómena» (1851).",
    source: "Parerga y Paralipómena (Vol. II, Estudios psicológicos)"
  },
  {
    id: 5,
    quote: "Hay preguntas que envejecen mejor que sus respuestas.",
    correct: "ia",
    author: "Ninguno",
    explanation: "Frase generada por inteligencia artificial para este juego.",
    source: "Experimento de generación sintética"
  },
  {
    id: 6,
    quote: "No hables a menos que puedas mejorar el silencio.",
    correct: "trucha",
    author: "Atribuida habitualmente a Jorge Luis Borges",
    explanation: "Circula masivamente en redes atribuida a Borges, pero no tiene ninguna fuente borgeana fiable (ya circulaba en el siglo XIX como proverbio inglés o máxima de Thomas Carlyle).",
    source: "Verificación de corpus borgeano"
  },
  {
    id: 7,
    quote: "Es difícil lograr que un hombre entienda algo cuando su salario depende de que no lo entienda.",
    correct: "autor",
    author: "Upton Sinclair",
    explanation: "Cita real del escritor y periodista estadounidense Upton Sinclair, formulada durante su campaña a gobernador de California en 1934.",
    source: "I, Candidate for Governor: And How I Got Licked (1935)"
  },
  {
    id: 8,
    quote: "La memoria no conserva el pasado: negocia con él.",
    correct: "ia",
    author: "Ninguno",
    explanation: "Frase generada por inteligencia artificial para este juego.",
    source: "Experimento de generación sintética"
  },
  {
    id: 9,
    quote: "Sé vos mismo; todos los demás ya están ocupados.",
    correct: "trucha",
    author: "Atribuida habitualmente a Oscar Wilde",
    explanation: "Frase muy difundida como cita de Oscar Wilde («Be yourself; everyone else is already taken»), pero sin ninguna fuente fiable ni registro en su obra publicada ni epistolar.",
    source: "Quote Investigator / Estudios wildeanos"
  }
];
