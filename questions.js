/**
 * BANCO DE PREGUNTAS: ¿Autor/a o IA? (6 frases)
 * 
 * `authorOption`: Nombre del autor o autora que aparece en el primer botón de votación (antes de "IA").
 * `correct`: "autor" (si realmente es de ese autor/a) o "ia" (si fue generada por IA imitándolo/a).
 * `verdictLabel`: Texto destacado al revelar la respuesta.
 * `source`: Referencia bibliográfica o aclaración.
 */

window.DEFAULT_QUESTIONS = [
  {
    id: 1,
    quote: "El olvido no destruye los recuerdos; apenas cambia el orden de la biblioteca que somos.",
    authorOption: "Jorge Luis Borges",
    correct: "ia",
    verdictLabel: "IA (imitando a Borges)",
    source: "Frase generada por Inteligencia Artificial imitando el estilo de Jorge Luis Borges."
  },
  {
    id: 2,
    quote: "La poesía unida a la realidad es la historia.",
    authorOption: "María Zambrano",
    correct: "autor",
    verdictLabel: "María Zambrano",
    source: "Zambrano, M. (1939). «Razón, poesía, historia», en Pensamiento y poesía en la vida española. México: La Casa de España en México."
  },
  {
    id: 3,
    quote: "La resistencia al cambio no siempre protege lo conocido; a veces protege la identidad que construimos alrededor de ello.",
    authorOption: "Enrique Pichon-Rivière",
    correct: "ia",
    verdictLabel: "IA (imitando a Pichon-Rivière)",
    source: "Frase generada por Inteligencia Artificial imitando el estilo de Enrique Pichon-Rivière."
  },
  {
    id: 4,
    quote: "¿Qué diferencia puede haber entre recordar sueños y recordar el pasado?",
    authorOption: "Jorge Luis Borges",
    correct: "autor",
    verdictLabel: "Jorge Luis Borges",
    source: "Borges, J. L. (1979). «El libro», en Borges oral. Buenos Aires: Emecé / Editorial de Belgrano. Conferencia pronunciada en 1978."
  },
  {
    id: 5,
    quote: "El sujeto no es sólo un sujeto relacionado, es un sujeto producido en una praxis.",
    authorOption: "Enrique Pichon-Rivière",
    correct: "autor",
    verdictLabel: "Enrique Pichon-Rivière",
    source: "Pichon-Rivière, E. (1972). «Aportaciones a la didáctica de la psicología social», incluido en El proceso grupal. Del psicoanálisis a la psicología social (I). Buenos Aires: Nueva Visión."
  },
  {
    id: 6,
    quote: "A veces la verdad no se esconde: espera a que el pensamiento deje de perseguirla.",
    authorOption: "María Zambrano",
    correct: "ia",
    verdictLabel: "IA (imitando a Zambrano)",
    source: "Frase generada por Inteligencia Artificial imitando el estilo de María Zambrano."
  }
];
