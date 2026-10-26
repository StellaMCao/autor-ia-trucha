/**
 * BANCO DE PREGUNTAS: ¿Autor o IA?
 * 
 * Cada frase tiene únicamente dos posibilidades:
 *   - "autor": Cita real de un autor humano (con fuente filológica verificada).
 *   - "ia":    Frase sintética generada por Inteligencia Artificial (atribuida aquí a un autor plausible para poner a prueba al público).
 * 
 * `claimedAuthor`: El nombre del autor propuesto que se muestra en el botón de votación (ej. "AUTOR (Friedrich Nietzsche)").
 * `source`: Obra, año y sección exacta verificada.
 */

window.DEFAULT_QUESTIONS = [
  {
    id: 1,
    quote: "Las convicciones son enemigos de la verdad más peligrosos que las mentiras.",
    correct: "autor",
    claimedAuthor: "Friedrich Nietzsche",
    author: "Friedrich Nietzsche",
    explanation: "Cita auténtica y verificada de Friedrich Nietzsche, publicada en 1878.",
    source: "Humano, demasiado humano (Vol. I, Sección 9, Aforismo § 483, 1878)"
  },
  {
    id: 2,
    quote: "La certeza es la forma más cómoda que tiene la ignorancia de descansar.",
    correct: "ia",
    claimedAuthor: "Emil Cioran",
    author: "Inteligencia Artificial",
    explanation: "Frase generada íntegramente por inteligencia artificial imitando el estilo aforístico escéptico.",
    source: "Generación sintética para este experimento (no existe en el corpus de Cioran)"
  },
  {
    id: 3,
    quote: "La duda es uno de los nombres de la inteligencia.",
    correct: "autor",
    claimedAuthor: "Jorge Luis Borges",
    author: "Jorge Luis Borges",
    explanation: "Cita auténtica y verificada de Jorge Luis Borges en una entrevista con María Esther Vázquez.",
    source: "Borges: imágenes, memorias, diálogos (Monte Ávila Editores, 1977, p. 109)"
  },
  {
    id: 4,
    quote: "Cada hombre toma los límites de su propio campo de visión por los límites del mundo.",
    correct: "autor",
    claimedAuthor: "Arthur Schopenhauer",
    author: "Arthur Schopenhauer",
    explanation: "Cita auténtica y verificada de Arthur Schopenhauer, publicada en Berlín en 1851.",
    source: "Parerga y Paralipómena (Vol. II, Cap. XXVI «Observaciones psicológicas», § 306, 1851)"
  },
  {
    id: 5,
    quote: "Hay preguntas que envejecen mejor que sus respuestas.",
    correct: "ia",
    claimedAuthor: "Stanisław Lem",
    author: "Inteligencia Artificial",
    explanation: "Frase generada por inteligencia artificial para este juego.",
    source: "Generación sintética (sin registro en obras publicadas)"
  },
  {
    id: 6,
    quote: "La verdad rara vez es pura y nunca es simple.",
    correct: "autor",
    claimedAuthor: "Oscar Wilde",
    author: "Oscar Wilde",
    explanation: "Cita auténtica y verificada de Oscar Wilde, pronunciada por Algernon en el primer acto de su comedia más célebre.",
    source: "La importancia de llamarse Ernesto (Acto I, 1895: «The truth is rarely pure and never simple»)"
  },
  {
    id: 7,
    quote: "Es difícil lograr que un hombre entienda algo cuando su salario depende de que no lo entienda.",
    correct: "autor",
    claimedAuthor: "Upton Sinclair",
    author: "Upton Sinclair",
    explanation: "Cita auténtica y verificada del escritor y periodista Upton Sinclair sobre su campaña en California.",
    source: "I, Candidate for Governor: And How I Got Licked (1935, p. 109)"
  },
  {
    id: 8,
    quote: "La memoria no conserva el pasado: negocia con él.",
    correct: "ia",
    claimedAuthor: "Paul Valéry",
    author: "Inteligencia Artificial",
    explanation: "Frase generada por inteligencia artificial imitando el tono ensayístico francés.",
    source: "Generación sintética para este juego"
  },
  {
    id: 9,
    quote: "El mayor enemigo del conocimiento no es la ignorancia, sino la ilusión del conocimiento.",
    correct: "autor",
    claimedAuthor: "Daniel J. Boorstin",
    author: "Daniel J. Boorstin",
    explanation: "Cita verificada del historiador y director de la Biblioteca del Congreso de EE. UU., Daniel J. Boorstin (a menudo mal atribuida en internet a Stephen Hawking).",
    source: "The Discoverers (Random House, 1983, p. 86 / Washington Post, 29 de enero de 1984)"
  }
];
