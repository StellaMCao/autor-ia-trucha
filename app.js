/**
 * LÓGICA CENTRAL Y SINCRONIZACIÓN EN TIEMPO REAL
 * ¿Autor o IA?
 * 
 * Soporta:
 * 1. Firebase Realtime Database (para producción con celulares del público).
 * 2. Sincronización Local multi-pestaña (BroadcastChannel + localStorage) de respaldo.
 */

(function () {
  const STORAGE_KEY_LOCAL_DB = "ait_local_db_v2";
  const STORAGE_KEY_DEVICE_ID = "ait_device_id_v2";
  const STORAGE_KEY_CUSTOM_QUESTIONS = "ait_custom_questions_v2";
  const STORAGE_KEY_VOTED_CACHE = "ait_voted_cache_v2";

  // Estados posibles de la sesión
  const STATES = {
    WAITING: "waiting",       // Estado 1: Ingreso / QR grande
    OPEN: "open",             // Estado 2: Votación abierta
    CLOSED: "closed",         // Estado 3: Votación cerrada (suspenso)
    RESULTS: "results",       // Estado 4: Resultados (barras horizontales neutras)
    REVEALED: "revealed",     // Estado 5: Revelación de respuesta correcta y fuente verificada
    FINAL: "final"            // Resultado final de las 9 frases
  };

  const DEFAULT_SESSION_STATE = {
    status: STATES.OPEN,
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
          const path = window.FIREBASE_DB_PATH || "ficcionario/autor_ia_trucha_session";
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
        this.channel = new BroadcastChannel("autor_ia_channel_v2");
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

    // Etiqueta dinámica con el nombre del autor para una pregunta dada
    getAuthorOptionLabel(question) {
      if (!question) return "AUTOR";
      const name = question.claimedAuthor || (question.correct === "autor" ? question.author : null);
      if (name && name.toLowerCase() !== "ninguno" && name.toLowerCase() !== "inteligencia artificial") {
        return `AUTOR (${name})`;
      }
      return "AUTOR";
    }

    computeQuestionStats(question, questionVotesObj) {
      const entries = Object.values(questionVotesObj || {});
      const counts = { autor: 0, ia: 0 };

      entries.forEach((v) => {
        const choice = typeof v === "string" ? v : v && v.choice;
        if (choice === "autor" || choice === "ia") {
          counts[choice]++;
        }
      });

      const total = counts.autor + counts.ia;
      const pct = {
        autor: total > 0 ? Math.round((counts.autor / total) * 100) : 0,
        ia: total > 0 ? Math.round((counts.ia / total) * 100) : 0
      };

      // Ajuste para que autor + ia sume exactamente 100% cuando hay votos
      if (total > 0 && pct.autor + pct.ia !== 100) {
        pct.ia = 100 - pct.autor;
      }

      const correctChoice = question.correct === "ia" ? "ia" : "autor";
      const correctCount = counts[correctChoice] || 0;
      const accuracyPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

      return {
        questionId: question.id,
        total,
        counts,
        pct,
        correctChoice,
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
          subtitle: "Confiaron demasiado en las comillas solemnes. Cualquier modelo con vocabulario filosófico les vende un aforismo."
        };
      }
      if (pct <= 50) {
        return {
          range: "34–50 %",
          title: "Apenas mejor que desconfiar al azar",
          subtitle: "Una moneda tirada al aire habría tenido dudas existenciales parecidas, pero van por buen camino."
        };
      }
      if (pct <= 70) {
        return {
          range: "51–70 %",
          title: "Detectives digitales en entrenamiento",
          subtitle: "Buen oído para el estilo clásico, aunque algún aforismo sintético logró infiltrarse."
        };
      }
      if (pct <= 85) {
        return {
          range: "71–85 %",
          title: "Alarmantemente desconfiados",
          subtitle: "Excelente radar crítico. Distinguen la pluma humana del cálculo estadístico con precisión."
        };
      }
      return {
        range: "86–100 %",
        title: "O son muy buenos o ya habían visto las respuestas",
        subtitle: "Nivel supremo de escepticismo ilustrado. Ni Nietzsche, ni Borges ni el modelo de lenguaje pudieron engañarlos."
      };
    }

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

    getDeviceVote(questionId) {
      const deviceId = this.getDeviceId();
      const qVotes = (this.data.votes && this.data.votes[questionId]) || {};
      if (qVotes[deviceId]) {
        return typeof qVotes[deviceId] === "string"
          ? qVotes[deviceId]
          : qVotes[deviceId].choice;
      }

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

    async submitVote(questionId, choice, customVoterId = null) {
      if (!["autor", "ia"].includes(choice)) {
        throw new Error("Opción de voto inválida");
      }

      const voterId = customVoterId || this.getDeviceId();

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

    async simulateVotesForCurrentQuestion(count = 20, accuracyBias = 0.58) {
      const snap = this.getSnapshot();
      const q = snap.currentQuestion;
      if (!q) return;

      const correctChoice = q.correct === "ia" ? "ia" : "autor";
      const wrongChoice = correctChoice === "autor" ? "ia" : "autor";
      const batch = {};

      for (let i = 0; i < count; i++) {
        const botId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`;
        const isCorrect = Math.random() < accuracyBias;
        const choice = isCorrect ? correctChoice : wrongChoice;

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
      const biases = [0.74, 0.42, 0.81, 0.68, 0.37, 0.77, 0.85, 0.46, 0.59];

      questions.forEach((q, idx) => {
        if (!allVotes[q.id]) allVotes[q.id] = {};
        const correctChoice = q.correct === "ia" ? "ia" : "autor";
        const wrongChoice = correctChoice === "autor" ? "ia" : "autor";
        const bias = biases[idx % biases.length];

        for (let i = 0; i < votersPerQuestion; i++) {
          const botId = `sim_all_${idx}_${i}_${Math.random().toString(36).substring(2, 6)}`;
          const isCorrect = Math.random() < bias;
          const choice = isCorrect ? correctChoice : wrongChoice;
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

  const CATEGORY_META = {
    autor: {
      key: "autor",
      label: "AUTOR",
      shortLabel: "Autor real",
      revealBadge: "📚 ERA AUTOR",
      emoji: "📚",
      description: "Escrita por una persona real con fuente verificada."
    },
    ia: {
      key: "ia",
      label: "IA",
      shortLabel: "Inteligencia Artificial",
      revealBadge: "🤖 ERA IA",
      emoji: "🤖",
      description: "Generada estadísticamente por Inteligencia Artificial."
    }
  };

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
