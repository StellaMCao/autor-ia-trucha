/**
 * CONFIGURACIÓN DE FIREBASE REALTIME DATABASE
 * 
 * Instrucciones rápidas:
 * 1. Creá un proyecto en https://console.firebase.google.com/
 * 2. Activá "Realtime Database" (en modo de prueba o con las reglas del README.md)
 * 3. En Configuración del proyecto -> Tus apps -> Web, copiá tu objeto `firebaseConfig`
 * 4. Reemplazá los valores de abajo con los de tu proyecto.
 * 
 * NOTA: Si todavía no pegaste tus credenciales reales, la aplicación funcionará
 * automáticamente en "MODO DEMO LOCAL" sincronizando entre pestañas del mismo
 * navegador (ideal para probar las 3 pantallas y el simulador de votos al instante).
 */

window.FIREBASE_CONFIG = {
  apiKey: "PEGAR_AQUI_TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

// Ruta raíz dentro de la base de datos de Firebase
window.FIREBASE_DB_PATH = "autor_ia_trucha_session";
