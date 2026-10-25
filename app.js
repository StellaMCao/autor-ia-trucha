/**
 * LÓGICA CENTRAL Y SINCRONIZACIÓN EN TIEMPO REAL
 * ¿Autor, IA o cita trucha?
 * 
 * Soporta:
 * 1. Firebase Realtime Database (para producción con celulares del público).
 * 2. Sincronización Local multi-pestaña (BroadcastChannel + localStorage) cuando
 *    Firebase aún no fue configurado o para modo de prueba rápido.
 */

(function () {
  const STORAGE_KEY_LOCAL_DB = "ait_local_db_v1";
  const STORAGE_KEY_DEVICE_ID = "ait_device_id_v1";
  const STORAGE_KEY_CUSTOM_QUESTIONS = "ait_custom_questions_v1";
  const STORAGE_KEY_VOTED_CACHE = "ait_voted_cache_v1";

  // Estados posibles de la sesión
  const STATES = {
    WAITING: "waiting",       // Estado 1: Ingreso / Esperando la próxima frase
    OPEN: "open",             // Estado 2: Votación abierta
    CLOSED: "closed",         // Estado 3: Votación cerrada (suspenso)
    RESULTS: "results",       // Estado 4: Resultados (barras horizontales neutras)
    REVEALED: "revealed",     // Estado 5: Revelación de respuesta correcta y explicación
    FINAL: "final"            // Resultado final de las frases
  };

  const DEFAULT_SESSION_STATE = {
    status: STATES.WAITING,
    currentIndex: 0,
    showQRModal: false,
    sessionId: "sess_initial",
    updatedAt: Date.now()
  };

  class GameSyncEngine {
    constructor() {
      this.mode = "local"; // "firebase" | "local"
      this.isConnected = true;
      this.db = null;
      this.rootRef = null;
      this.channel = null;

      this.data = {
        state: { ...DEFAULT_SESSION_STATE },
        votes: {},
        customQuestions: null
      };

      this.listeners = new Set();
      this.connectionListeners = new Set();
    }

    init() {
      const cfg = window.FIREBASE_CONFIG || {};
      const isConfigured =
        cfg.databaseURL &&
        !cfg.databaseURL.includes("tu-proyecto") &&
        cfg.apiKey &&
        !cfg.apiKey.includes("PEGAR_AQUI");

      if (isConfigured && typeof window.firebase !== "undefined") {
        try {
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(cfg);
          }
          this.db = window.firebase.database();
          const path = window.FIREBASE_DB_PATH || "autor_ia_trucha_session";
          this.rootRef = this.db.ref(path);
          this.mode = "firebase";
          this._setupFirebaseListeners();
          return;
        } catch (err) {
          console.warn("Error inicializando Firebase, usando modo local:", err);
        }
      }

      this.mode = "local";
      this._setupLocalListeners();
    }

    _setupFirebaseListeners() {
      // Estado de conexión de Firebase
      const connectedRef = this.db.ref(".info/connected");
      connectedRef.on("value", (snap) => {
        this.isConnected = snap.val() === true;
        this._notifyConnection();
      });

      this.rootRef.on(
        "value",
        (snapshot) => {
          const val = snapshot.val() || {};
          this.data = {
            state: { ...DEFAULT_SESSION_STATE, ...(val.state || {}) },
            votes: val.votes || {},
            customQuestions: val.customQuestions || null
          };
          this._notify();
        },
        (error) => {
          console.error("Error de lectura en Firebase:", error);
          this.isConnected = false;
          this._notifyConnection();
        }
      );
    }

    _setupLocalListeners() {
      this._loadFromLocalStorage();

      if (typeof BroadcastChannel !== "undefined") {
        this.channel = new BroadcastChannel("autor_ia_trucha_channel");
        this.channel.onmessage = () => {
          this._loadFromLocalStorage();
          this._notify();
        };
      }

      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY_LOCAL_DB) {
          this._loadFromLocalStorage();
          this._notify();
        }
      });

      window.addEventListener("online", () => {
        this.isConnected = true;
        this._notifyConnection();
      });
      window.addEventListener("offline", () => {
        this.isConnected = false;
        this._notifyConnection();
      });

      setTimeout(() => {
        this._notifyConnection();
        this._notify();
      }, 10);
    }

    _loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCAL_DB);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = {
            state: { ...DEFAULT_SESSION_STATE, ...(parsed.state || {}) },
            votes: parsed.votes || {},
            customQuestions: parsed.customQuestions || null
          };
        } else {
          this._saveToLocalStorage();
        }
      } catch (e) {
        console.warn("No se pudo leer localStorage:", e);
      }
    }

    _saveToLocalStorage() {
      try {
        localStorage.setItem(STORAGE_KEY_LOCAL_DB, JSON.stringify(this.data));
        if (this.channel) {
          this.channel.postMessage({ type: "sync", ts: Date.now() });
        }
      } catch (e) {
        console.warn("No se pudo guardar en localStorage:", e);
      }
    }

    subscribe(cb) {
      this.listeners.add(cb);
      cb(this.getSnapshot());
      return () => this.listeners.delete(cb);
    }

    onConnectionChange(cb) {
      this.connectionListeners.add(cb);
      cb({ isConnected: this.isConnected, mode: this.mode });
      return () => this.connectionListeners.delete(cb);
    }

    _notify() {
      const snap = this.getSnapshot();
      this.listeners.forEach((cb) => {
        try {
          cb(snap);
        } catch (err) {
          console.error("Error en listener:", err);
        }
      });
    }

    _notifyConnection() {
      const info = { isConnected: this.isConnected, mode: this.mode };
      this.connectionListeners.forEach((cb) => cb(info));
    }

    getQuestions() {
      if (Array.isArray(this.data.customQuestions) && this.data.customQuestions.length > 0) {
        return this.data.customQuestions;
      }
      try {
        const localCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTIONS);
        if (localCustom) {
          const parsed = JSON.parse(localCustom);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      return window.DEFAULT_QUESTIONS || [];
    }

    getSnapshot() {
      const questions = this.getQuestions();
      const state = this.data.state || DEFAULT_SESSION_STATE;
      const safeIndex = Math.max(0, Math.min(state.currentIndex || 0, Math.max(0, questions.length - 1)));
      const currentQuestion = questions[safeIndex] || null;
      const votesByQuestion = this.data.votes || {};

      return {
        mode: this.mode,
        isConnected: this.isConnected,
        state: {
          ...state,
          currentIndex: safeIndex
        },
        questions,
        currentQuestion,
        votesByQuestion,
        currentQuestionStats: currentQuestion
          ? this.computeQuestionStats(currentQuestion, votesByQuestion[currentQuestion.id] || {})
          : null,
        globalSummary: this.computeGlobalSummary(questions, votesByQuestion)
      };
    }

    computeQuestionStats(question, questionVotesObj) {
      const entries = Object.values(questionVotesObj || {});
      const counts = { autor: 0, ia: 0, trucha: 0 };

      entries.forEach((v) => {
        const choice = typeof v === "string" ? v : v && v.choice;
        if (choice && counts.hasOwnProperty(choice)) {
          counts[choice]++;
        }
      });

      const total = counts.autor + counts.ia + counts.trucha;
      const pct = {
        autor: total > 0 ? Math.round((counts.autor / total) * 100) : 0,
        ia: total > 0 ? Math.round((counts.ia / total) * 100) : 0,
        trucha: total > 0 ? Math.round((counts.trucha / total) * 100) : 0
      };

      // Ajuste fino para que la suma de porcentajes cerrados dé exactamente 100% cuando total > 0
      if (total > 0) {
        const sum = pct.autor + pct.ia + pct.trucha;
        if (sum !== 100) {
          const maxKey = ["autor", "ia", "trucha"].reduce((a, b) =>
            counts[a] >= counts[b] ? a : b
          );
          pct[maxKey] += 100 - sum;
        }
      }

      const correctCount = counts[question.correct] || 0;
      const accuracyPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

      return {
        questionId: question.id,
        total,
        counts,
        pct,
        correctChoice: question.correct,
        correctCount,
        accuracyPct
      };
    }

    computeGlobalSummary(questions, votesByQuestion) {
      let totalVotesAll = 0;
      let totalCorrectAll = 0;

      const perQuestion = questions.map((q, idx) => {
        const qVotes = (votesByQuestion && votesByQuestion[q.id]) || {};
        const stats = this.computeQuestionStats(q, qVotes);
        totalVotesAll += stats.total;
        totalCorrectAll += stats.correctCount;
        return {
          index: idx + 1,
          question: q,
          stats
        };
      });

      const globalAccuracyPct =
        totalVotesAll > 0 ? Math.round((totalCorrectAll / totalVotesAll) * 100) : 0;

      // Ordenar de la más fácil (mayor % de aciertos) a la más engañosa (menor % de aciertos)
      const sortedByDifficulty = [...perQuestion].sort((a, b) => {
        if (b.stats.accuracyPct !== a.stats.accuracyPct) {
          return b.stats.accuracyPct - a.stats.accuracyPct;
        }
        return b.stats.total - a.stats.total;
      });

      const rank = this.getEpistemologicalRank(globalAccuracyPct);

      return {
        totalVotesAll,
        totalCorrectAll,
        globalAccuracyPct,
        perQuestion,
        sortedByDifficulty,
        rank
      };
    }

    getEpistemologicalRank(pct) {
      if (pct <= 33) {
        return {
          range: "0–33 %",
          title: "Paranoia epistemológica insuficiente",
          subtitle: "Confiaron demasiado en las comillas solemnes. Cualquier bot con vocabulario filosófico les vende un buzón."
        };
      }
      if (pct <= 50) {
        return {
          range: "34–50 %",
          title: "Apenas mejor que desconfiar al azar",
          subtitle: "Una moneda tirada al aire habría tenido crisis existenciales parecidas, pero van por buen camino."
        };
      }
      if (pct <= 70) {
        return {
          range: "51–70 %",
          title: "Detectives digitales en entrenamiento",
          subtitle: "Buen olfato para las falsificaciones virales, aunque algún aforismo sintético logró infiltrarse."
        };
      }
      if (pct <= 85) {
        return {
          range: "71–85 %",
          title: "Alarmantemente desconfiados",
          subtitle: "Excelente radar crítico. Probablemente revisan la fuente hasta de los saludos de cumpleaños."
        };
      }
      return {
        range: "86–100 %",
        title: "O son muy buenos o ya habían visto las respuestas",
        subtitle: "Nivel supremo de escepticismo ilustrado. Ni Nietzsche, ni Wilde ni el modelo de lenguaje pudieron engañarlos."
      };
    }

    // Identificador local anónimo único por dispositivo
    getDeviceId() {
      try {
        let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
        if (!id) {
          id =
            "dev_" +
            Math.random().toString(36).substring(2, 10) +
            "_" +
            Date.now().toString(36);
          localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
        }
        return id;
      } catch (e) {
        if (!this._fallbackDeviceId) {
          this._fallbackDeviceId = "dev_mem_" + Math.random().toString(36).substring(2, 10);
        }
        return this._fallbackDeviceId;
      }
    }

    // Verifica si este dispositivo ya votó en la pregunta actual (en esta sesión)
    getDeviceVote(questionId) {
      const deviceId = this.getDeviceId();
      const qVotes = (this.data.votes && this.data.votes[questionId]) || {};
      if (qVotes[deviceId]) {
        return typeof qVotes[deviceId] === "string"
          ? qVotes[deviceId]
          : qVotes[deviceId].choice;
      }

      // Respaldo en localStorage por si está cargando la red
      try {
        const cache = JSON.parse(localStorage.getItem(STORAGE_KEY_VOTED_CACHE) || "{}");
        const sessionKey = (this.data.state && this.data.state.sessionId) || "default";
        if (cache[sessionKey] && cache[sessionKey][questionId]) {
          return cache[sessionKey][questionId];
        }
      } catch (e) {}

      return null;
    }

    _setDeviceVoteCache(questionId, choice) {
      try {
        const cache = JSON.parse(localStorage.getItem(STORAGE_KEY_VOTED_CACHE) || "{}");
        const sessionKey = (this.data.state && this.data.state.sessionId) || "default";
        if (!cache[sessionKey]) cache[sessionKey] = {};
        if (choice === null) {
          delete cache[sessionKey][questionId];
        } else {
          cache[sessionKey][questionId] = choice;
        }
        localStorage.setItem(STORAGE_KEY_VOTED_CACHE, JSON.stringify(cache));
      } catch (e) {}
    }

    // Registrar voto de participante
    async submitVote(questionId, choice, customVoterId = null) {
      if (!["autor", "ia", "trucha"].includes(choice)) {
        throw new Error("Opción de voto inválida");
      }

      const voterId = customVoterId || this.getDeviceId();

      // Si es el participante real (sin customVoterId), impedir voto repetido
      if (!customVoterId && this.getDeviceVote(questionId)) {
        return { alreadyVoted: true };
      }

      const votePayload = {
        choice,
        ts: Date.now()
      };

      if (!customVoterId) {
        this._setDeviceVoteCache(questionId, choice);
      }

      if (this.mode === "firebase" && this.rootRef) {
        await this.rootRef.child(`votes/${questionId}/${voterId}`).set(votePayload);
      } else {
        this._loadFromLocalStorage();
        if (!this.data.votes[questionId]) {
          this.data.votes[questionId] = {};
        }
        this.data.votes[questionId][voterId] = votePayload;
        this._saveToLocalStorage();
        this._notify();
      }

      return { success: true };
    }

    // Acciones de Administración
    async updateState(partialState) {
      const nextState = {
        ...(this.data.state || DEFAULT_SESSION_STATE),
        ...partialState,
        updatedAt: Date.now()
      };

      if (this.mode === "firebase" && this.rootRef) {
        await this.rootRef.child("state").set(nextState);
      } else {
        this._loadFromLocalStorage();
        this.data.state = nextState;
        this._saveToLocalStorage();
        this._notify();
      }
    }

    async resetQuestionVotes(questionId) {
      this._setDeviceVoteCache(questionId, null);
      if (this.mode === "firebase" && this.rootRef) {
        await this.rootRef.child(`votes/${questionId}`).remove();
      } else {
        this._loadFromLocalStorage();
        if (this.data.votes && this.data.votes[questionId]) {
          delete this.data.votes[questionId];
        }
        this._saveToLocalStorage();
        this._notify();
      }
    }

    async resetEntireSession() {
      const newSessionId = "sess_" + Date.now().toString(36);
      const freshState = {
        status: STATES.WAITING,
        currentIndex: 0,
        showQRModal: false,
        sessionId: newSessionId,
        updatedAt: Date.now()
      };

      try {
        localStorage.removeItem(STORAGE_KEY_VOTED_CACHE);
      } catch (e) {}

      if (this.mode === "firebase" && this.rootRef) {
        await this.rootRef.update({
          state: freshState,
          votes: null
        });
      } else {
        this.data.state = freshState;
        this.data.votes = {};
        this._saveToLocalStorage();
        this._notify();
      }
    }

    // Simulador de votos para modo de prueba sin necesitar varios celulares
    async simulateVotesForCurrentQuestion(count = 25, accuracyBias = 0.48) {
      const snap = this.getSnapshot();
      const q = snap.currentQuestion;
      if (!q) return;

      const options = ["autor", "ia", "trucha"];
      const wrongOptions = options.filter((o) => o !== q.correct);
      const batch = {};

      for (let i = 0; i < count; i++) {
        const botId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`;
        const isCorrect = Math.random() < accuracyBias;
        const choice = isCorrect
          ? q.correct
          : wrongOptions[Math.floor(Math.random() * wrongOptions.length)];

        batch[botId] = {
          choice,
          simulated: true,
          ts: Date.now()
        };
      }

      if (this.mode === "firebase" && this.rootRef) {
        await this.rootRef.child(`votes/${q.id}`).update(batch);
      } else {
        this._loadFromLocalStorage();
        if (!this.data.votes[q.id]) this.data.votes[q.id] = {};
        Object.assign(this.data.votes[q.id], batch);
        this._saveToLocalStorage();
        this._notify();
      }
    }

    async simulateAllQuestionsVotes(votersPerQuestion = 35) {
      const questions = this.getQuestions();
      const allVotes = { ...(this.data.votes || {}) };

      // Distintos niveles de dificultad simulada para que el ranking final luzca realista
      const biases = [0.68, 0.42, 0.29, 0.74, 0.51, 0.35, 0.79, 0.46, 0.24];

      questions.forEach((q, idx) => {
        if (!allVotes[q.id]) allVotes[q.id] = {};
        const options = ["autor", "ia", "trucha"];
        const wrongOptions = options.filter((o) => o !== q.correct);
        const bias = biases[idx % biases.length];

        for (let i = 0; i < votersPerQuestion; i++) {
          const botId = `sim_all_${idx}_${i}_${Math.random().toString(36).substring(2, 6)}`;
          const isCorrect = Math.random() < bias;
          const choice = isCorrect
            ? q.correct
            : wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
          allVotes[q.id][botId] = { choice, simulated: true, ts: Date.now() };
        }
      });

      if (this.mode === "firebase" && this.rootRef) {
        await this.rootRef.child("votes").set(allVotes);
      } else {
        this._loadFromLocalStorage();
        this.data.votes = allVotes;
        this._saveToLocalStorage();
        this._notify();
      }
    }

    // Permite editar/reordenar/agregar frases desde el panel de administración si se desea
    async saveCustomQuestions(newQuestionsArray) {
      try {
        if (newQuestionsArray === null) {
          localStorage.removeItem(STORAGE_KEY_CUSTOM_QUESTIONS);
        } else {
          localStorage.setItem(STORAGE_KEY_CUSTOM_QUESTIONS, JSON.stringify(newQuestionsArray));
        }
      } catch (e) {}

      if (this.mode === "firebase" && this.rootRef) {
        await this.rootRef.child("customQuestions").set(newQuestionsArray);
      } else {
        this._loadFromLocalStorage();
        this.data.customQuestions = newQuestionsArray;
        this._saveToLocalStorage();
        this._notify();
      }
    }

    // Obtiene la URL pública hacia index.html para generar el código QR automáticamente
    getParticipantUrl() {
      const customUrl = localStorage.getItem("ait_custom_participant_url");
      if (customUrl && customUrl.trim().length > 0) {
        return customUrl.trim();
      }
      const loc = window.location;
      let path = loc.pathname;
      path = path.replace(/\/(admin|resultados|index)\.html$/i, "/");
      if (!path.endsWith("/")) {
        path += "/";
      }
      return `${loc.origin}${path}index.html`;
    }

    setParticipantUrl(url) {
      if (!url || !url.trim()) {
        localStorage.removeItem("ait_custom_participant_url");
      } else {
        localStorage.setItem("ait_custom_participant_url", url.trim());
      }
      this._notify();
    }
  }

  // Metadatos visuales y de texto para cada opción
  const CATEGORY_META = {
    autor: {
      key: "autor",
      label: "AUTOR",
      shortLabel: "Autor real",
      revealBadge: "📚 ERA AUTOR",
      emoji: "📚",
      description: "Escrita por una persona de carne, hueso y contradicciones."
    },
    ia: {
      key: "ia",
      label: "IA",
      shortLabel: "Inteligencia Artificial",
      revealBadge: "🤖 ERA IA",
      emoji: "🤖",
      description: "Generada estadísticamente por un modelo de lenguaje."
    },
    trucha: {
      key: "trucha",
      label: "CITA TRUCHA",
      shortLabel: "Cita apócrifa",
      revealBadge: "🎭 ERA CITA TRUCHA",
      emoji: "🎭",
      description: "Falsamente atribuida en internet a una figura famosa."
    }
  };

  // Generador de QR limpio usando SVG o API de respaldo sin dependencias pesadas
  function renderQRCode(containerEl, text, size = 260) {
    if (!containerEl) return;
    containerEl.innerHTML = "";

    if (typeof window.QRCode !== "undefined") {
      try {
        new window.QRCode(containerEl, {
          text: text,
          width: size,
          height: size,
          colorDark: "#0b0d12",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M
        });
        return;
      } catch (e) {
        console.warn("Fallback QR image:", e);
      }
    }

    const img = document.createElement("img");
    img.alt = "Código QR para participar";
    img.width = size;
    img.height = size;
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(
      text
    )}`;
    containerEl.appendChild(img);
  }

  window.AIT = {
    STATES,
    CATEGORY_META,
    engine: new GameSyncEngine(),
    renderQRCode
  };
})();
