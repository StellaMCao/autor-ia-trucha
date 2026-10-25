/**
 * CONFIGURACIÓN DE FIREBASE REALTIME DATABASE
 * Conectado en tiempo real para sincronizar admin.html, resultados.html e index.html
 * entre distintos dispositivos y celulares.
 */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTLy_70DpMGXWl0O_oG1SNHauJPtY4VPI",
  authDomain: "ficcionario-eff04.firebaseapp.com",
  databaseURL: "https://ficcionario-eff04-default-rtdb.firebaseio.com",
  projectId: "ficcionario-eff04",
  storageBucket: "ficcionario-eff04.firebasestorage.app",
  messagingSenderId: "657632350416",
  appId: "1:657632350416:web:de9857445e1b76c00e8ed5"
};

// Ruta aislada dentro de la base de datos de Firebase con permisos de lectura/escritura activos
window.FIREBASE_DB_PATH = "ficcionario/autor_ia_trucha_session";
