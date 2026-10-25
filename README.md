# ¿Autor, IA o cita trucha?

> **Nueve frases. Tres posibilidades. Una confianza injustificadamente alta en nuestro propio criterio.**

Aplicación web interactiva en tiempo real pensada para presentaciones en vivo con auditorio. El público escanea un código QR con su celular y vota en cada ronda si la frase proyectada pertenece a un **AUTOR** real, fue generada por **IA** o es una **CITA TRUCHA** (apócrifa).

---

## Estructura del proyecto

El proyecto separa estrictamente diseño, lógica, configuración y datos, y funciona de manera 100 % estática en **GitHub Pages**:

- [`index.html`](./index.html): **Vista para participantes (celulares)**. Extremadamente simple, sin registro ni datos personales, bloquea votos repetidos por pregunta y mantiene el suspenso hasta la revelación en pantalla grande.
- [`admin.html`](./admin.html): **Panel de control para la presentadora**. Permite controlar los 5 estados de cada ronda, saltar o retroceder entre frases, mostrar el QR en pantalla, reiniciar preguntas o toda la sesión, editar frases al vuelo y **simular votos de prueba** sin necesitar múltiples teléfonos.
- [`resultados.html`](./resultados.html): **Pantalla proyectada (auditorio)**. Tipografía de alta legibilidad, alto contraste, barras animadas neutras (sin sugerir colores rojo/verde antes de tiempo), revelación con explicación y ranking final de las frases ordenadas de la más fácil a la más engañosa.
- [`questions.js`](./questions.js): **Banco de preguntas**. Podés agregar, quitar, editar o reordenar las frases directamente aquí sin tocar una sola línea de lógica.
- [`firebase-config.js`](./firebase-config.js): **Configuración de Firebase Realtime Database**.
- [`app.js`](./app.js): **Motor de sincronización en tiempo real** (con soporte para Firebase Realtime Database y modo de respaldo local multi-pestaña para pruebas inmediatas).
- [`styles.css`](./styles.css): **Diseño visual y animaciones**.

---

## Guía paso a paso de instalación y puesta en marcha

### 1. Crear el proyecto en Firebase

1. Entrá a [Firebase Console](https://console.firebase.google.com/) con tu cuenta de Google.
2. Hacé clic en **Crear un proyecto** (o *Add project*).
3. Poné un nombre (por ejemplo: `autor-ia-trucha`) y hacé clic en **Continuar**.
4. Podés **desactivar Google Analytics** (no es necesario para este juego) y hacer clic en **Crear proyecto**.
5. Esperá unos segundos y tocá **Continuar**.

---

### 2. Activar Realtime Database

1. En el menú lateral izquierdo de Firebase, abrí **Compilación** (*Build*) $\rightarrow$ **Realtime Database**.
2. Hacé clic en el botón **Crear base de datos** (*Create Database*).
3. Elegí la ubicación del servidor (por ejemplo `United States (us-central1)`) y tocá **Siguiente**.
4. Seleccioná **Comenzar en modo de prueba** (*Start in test mode*) y hacé clic en **Habilitar** (*Enable*).

---

### 3. Copiar y pegar la configuración en `firebase-config.js`

1. En Firebase Console, hacé clic en el ícono del **engranaje ⚙️** (arriba a la izquierda, junto a *Descripción general del proyecto*) y entrá a **Configuración del proyecto** (*Project settings*).
2. Bajá hasta la sección **Tus apps** (*Your apps*) y hacé clic en el ícono web **`</>`**.
3. Ponele un apodo a la app (por ejemplo `web-votos`), **no** hace falta marcar Firebase Hosting, y hacé clic en **Registrar app**.
4. Vas a ver un bloque de código con una variable `const firebaseConfig = { ... }`. Copiá las claves que aparecen adentro.
5. Abrí el archivo [`firebase-config.js`](./firebase-config.js) de este proyecto y reemplazá los valores de ejemplo por los tuyos:

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyA1B2C3D4E5F6G7H8I9J0...",
  authDomain: "autor-ia-trucha.firebaseapp.com",
  databaseURL: "https://autor-ia-trucha-default-rtdb.firebaseio.com",
  projectId: "autor-ia-trucha",
  storageBucket: "autor-ia-trucha.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

> **Tip:** Mientras no hayas pegado tus credenciales de Firebase, la aplicación funciona automáticamente en **Modo Demo Local**, sincronizando entre pestañas de tu propio navegador para que puedas probar todo en tu computadora de inmediato.

---

### 4. Configurar las reglas de seguridad en Firebase

1. Volvé a **Realtime Database** en el menú izquierdo de Firebase y abrí la pestaña **Reglas** (*Rules*).
2. Pegá las siguientes reglas para permitir que el público vote en tiempo real y evitar escrituras fuera de la ruta del juego:

```json
{
  "rules": {
    "autor_ia_trucha_session": {
      ".read": true,
      ".write": true
    }
  }
}
```

3. Hacé clic en **Publicar** (*Publish*).

---

### 5. Subir el proyecto a GitHub

1. Entrá a [GitHub](https://github.com/) e iniciá sesión.
2. Hacé clic en el botón **+** (arriba a la derecha) $\rightarrow$ **New repository**.
3. En *Repository name*, escribí por ejemplo: `autor-ia-trucha`.
4. Asegurate de que esté marcado como **Public** y hacé clic en **Create repository**.
5. En la pantalla siguiente, hacé clic en el enlace **uploading an existing file** (o subilo con Git desde tu terminal):
   - Arrastrá los 7 archivos del proyecto (`index.html`, `admin.html`, `resultados.html`, `styles.css`, `app.js`, `questions.js`, `firebase-config.js` y `README.md`).
   - Hacé clic en el botón verde **Commit changes**.

*(Si preferís subirlo por consola con Git)*:
```bash
git init
git add .
git commit -m "Versión inicial: ¿Autor, IA o cita trucha?"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/autor-ia-trucha.git
git push -u origin main
```

---

### 6. Activar GitHub Pages

1. Dentro de tu repositorio en GitHub, abrí la pestaña **Settings** (arriba).
2. En el menú lateral izquierdo, hacé clic en **Pages**.
3. En la sección **Build and deployment** $\rightarrow$ **Branch**:
   - Cambiá `None` por **`main`** (o `master`).
   - Dejá la carpeta en **`/ (root)`**.
   - Hacé clic en **Save**.

---

### 7. Obtener la URL final de las tres pantallas

Esperá entre 1 y 2 minutos y refrescá la página de *Settings $\rightarrow$ Pages*. Arriba aparecerá el cartel:
> *Your site is live at `https://tu-usuario.github.io/autor-ia-trucha/`*

Tus tres direcciones listas para usar en la presentación serán:

1. **Participantes (Celulares / QR):**  
   `https://tu-usuario.github.io/autor-ia-trucha/` *(o `/index.html`)*
2. **Panel de la Presentadora:**  
   `https://tu-usuario.github.io/autor-ia-trucha/admin.html`
3. **Pantalla para Proyectar en el Salón:**  
   `https://tu-usuario.github.io/autor-ia-trucha/resultados.html`

---

### 8. Generar y mostrar el código QR

**No necesitás usar ninguna página externa para crear el QR:**

- Tanto la **Pantalla Proyectada (`resultados.html`)** como el **Panel de Administración (`admin.html`)** detectan automáticamente la URL de tu sitio en GitHub Pages y generan el **código QR en alta definición** apuntando directamente a `index.html`.
- En el **Estado 1 (Ingreso)** de `resultados.html`, el QR aparece en tamaño gigante junto a la frase *«Escaneá el QR y preparate para desconfiar de todo»*.
- Si alguien llega tarde a mitad de la charla, desde `admin.html` podés tocar el botón **«📱 Mostrar QR en proyector»** en cualquier momento para superponer el código QR grande en la pantalla proyectada sin perder el progreso de la pregunta actual.
- Además, en `admin.html` tenés un campo opcional por si quisieras personalizar manualmente la URL del QR (por ejemplo, si usaras un acortador de enlaces propio).

---

## Cómo editar o agregar nuevas frases

Abrí [`questions.js`](./questions.js) con cualquier editor de texto (o directamente desde el botón de lápiz en la web de GitHub). Cada objeto sigue este formato:

```javascript
{
  id: 1,
  quote: "Las convicciones son enemigos de la verdad más peligrosos que las mentiras.",
  correct: "autor", // Valores posibles: "autor", "ia" o "trucha"
  author: "Friedrich Nietzsche",
  explanation: "Cita atribuible a Nietzsche.",
  source: "Humano, demasiado humano"
}
```
