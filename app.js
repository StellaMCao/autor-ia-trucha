/**
 * LÓGICA CENTRAL Y SINCRONIZACIÓN EN TIEMPO REAL
 * ¿Autor o IA? — Versión simplificada de 6 frases en sucesión
 * 
 * - Los participantes escanean el QR fijo y responden las 6 frases en sucesión a su propio ritmo.
 * - La pantalla proyectada (resultados.html) recibe los votos en tiempo real y muestra
 *   las 6 frases con sus porcentajes (y al hacer clic en "Revelar respuestas", muestra
 *   si era Autor/a o IA con su referencia bibliográfica).
 */

(function () {
  const STORAGE_KEY_LOCAL_DB = "ait_local_db_v6";
  const STORAGE_KEY_DEVICE_ID = "ait_device_id_v6";
  const STORAGE_KEY_VOTED_CACHE = "ait_voted_cache_v6";

  // URL fija para el QR (para proyectar o imprimir)
  const FIXED_PARTICIPANT_URL = "https://stellamcao.github.io/autor-ia-trucha/";

  // Estados de la pantalla proyectada
  const STATES = {
    QR: "qr",               // Pantalla con QR grande para escanear
    RESULTS: "results",     // Las 6 frases con sus barras de % en vivo (sin revelar solución)
    REVEALED: "revealed"    // Las 6 frases revelando Autor/a + referencia o IA
  };

  const DEFAULT_SESSION_STATE = {
    status: STATES.RESULTS,
    sessionId: "sess_6q_v1",
    updatedAt: Date.now()
  };

  class GameSyncEngine {
    constructor() {
      this.mode = "local";
      this.isConnected = true;
      this.db = null;
      this.rootRef = null;
      this.restBaseUrl = null;
      this.channel = null;
      this.pollTimer = null;

      this.data = {
        state: { ...DEFAULT_SESSION_STATE },
        votes: {}
      };

      this.listeners = new Set();
    }

    init() {
      const cfg = window.FIREBASE_CONFIG || {};
      const isConfigured =
        cfg.databaseURL &&
        !cfg.databaseURL.includes("tu-proyecto") &&
        cfg.apiKey &&
        !cfg.apiKey.includes("PEGAR_AQUI");

      if (isConfigured) {
        const cleanDbUrl = cfg.databaseURL.replace(/\/+$/, "");
        const path = (window.FIREBASE_DB_PATH || "ficcionario/autor_ia_trucha_session").replace(/^\/+|\/+$/g, "");
        this.restBaseUrl = `${cleanDbUrl}/${path}`;
        this.mode = "firebase";

        // Sincronización HTTP REST directa cada 2s (infalible en celulares y proyector)
        this._fetchViaRest();
        this.pollTimer = setInterval(() => this._fetchViaRest(), 2000);

        // Además WebSocket de Firebase para actualización instantánea
        if (typeof window.firebase !== "undefined") {
          try {
            if (!window.firebase.apps.length) {
              window.firebase.initializeApp(cfg);
            }
            this.db = window.firebase.database();
            this.rootRef = this.db.ref(path);
            this.rootRef.on("value", (snapshot) => {
              const val = snapshot.val() || {};
              this._applyIncomingData(val);
            });
          } catch (err) {
            console.warn("Usando REST directo:", err);
          }
        }
        return;
      }

      this.mode = "local";
      this._setupLocalListeners();
    }

    async _fetchViaRest() {
      if (!this.restBaseUrl) return;
      try {
        const res = await fetch(`${this.restBaseUrl}.json?t=${Date.now()}`, {
          cache: "no-store"
        });
        if (!res.ok) return;
        const val = (await res.json()) || {};
        this._applyIncomingData(val);
      } catch (e) {}
    }

    _applyIncomingData(val) {
      const incomingState = { ...DEFAULT_SESSION_STATE, ...(val.state || {}) };
      const prevSessionId = this.data.state && this.data.state.sessionId;
      if (prevSessionId && incomingState.sessionId && prevSessionId !== incomingState.sessionId) {
        // Si se reinició la sesión, limpiar caché local de votos
        try {
          localStorage.removeItem(STORAGE_KEY_VOTED_CACHE);
        } catch (e) {}
      }

      const prevJson = JSON.stringify({ s: this.data.state, v: this.data.votes });
      this.data = {
        state: incomingState,
        votes: val.votes || {}
      };
      const nextJson = JSON.stringify({ s: this.data.state, v: this.data.votes });
      if (prevJson !== nextJson) {
        this._notify();
      }
    }

    _setupLocalListeners() {
      this._loadFromLocalStorage();
      if (typeof BroadcastChannel !== "undefined") {
        this.channel = new BroadcastChannel("autor_ia_channel_v6");
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
      setTimeout(() => this._notify(), 10);
    }

    _loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCAL_DB);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = {
            state: { ...DEFAULT_SESSION_STATE, ...(parsed.state || {}) },
            votes: parsed.votes || {}
          };
        }
      } catch (e) {}
    }

    _saveToLocalStorage() {
      try {
        localStorage.setItem(STORAGE_KEY_LOCAL_DB, JSON.stringify(this.data));
        if (this.channel) {
          this.channel.postMessage({ type: "sync", ts: Date.now() });
        }
      } catch (e) {}
    }

    subscribe(cb) {
      this.listeners.add(cb);
      cb(this.getSnapshot());
      return () => this.listeners.delete(cb);
    }

    _notify() {
      const snap = this.getSnapshot();
      this.listeners.forEach((cb) => {
        try {
          cb(snap);
        } catch (err) {
          console.error(err);
        }
      });
    }

    getQuestions() {
      return window.DEFAULT_QUESTIONS || [];
    }

    getParticipantUrl() {
      return FIXED_PARTICIPANT_URL;
    }

    getSnapshot() {
      const questions = this.getQuestions();
      const state = this.data.state || DEFAULT_SESSION_STATE;
      const votesByQuestion = this.data.votes || {};
      const summary = this.computeGlobalSummary(questions, votesByQuestion);

      return {
        mode: this.mode,
        state,
        questions,
        votesByQuestion,
        summary
      };
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
      const uniqueVoters = new Set();

      const perQuestion = questions.map((q, idx) => {
        const qVotes = (votesByQuestion && votesByQuestion[q.id]) || {};
        Object.keys(qVotes).forEach((voterId) => uniqueVoters.add(voterId));
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

      return {
        totalVotesAll,
        totalCorrectAll,
        participantsCount: uniqueVoters.size,
        globalAccuracyPct,
        perQuestion
      };
    }

    getDeviceId() {
      try {
        let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
        if (!id) {
          id = "dev_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
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

    getDeviceVotesMap() {
      const sessionKey = (this.data.state && this.data.state.sessionId) || "default";
      const map = {};

      // 1. Leer de caché local
      try {
        const cache = JSON.parse(localStorage.getItem(STORAGE_KEY_VOTED_CACHE) || "{}");
        if (cache[sessionKey]) {
          Object.assign(map, cache[sessionKey]);
        }
      } catch (e) {}

      // 2. Completar con lo que haya en memoria de Firebase para este dispositivo
      const devId = this.getDeviceId();
      const votes = this.data.votes || {};
      Object.keys(votes).forEach((qId) => {
        if (votes[qId] && votes[qId][devId]) {
          const v = votes[qId][devId];
          map[qId] = typeof v === "string" ? v : v.choice;
        }
      });

      return map;
    }

    _saveDeviceVoteToCache(questionId, choice) {
      try {
        const sessionKey = (this.data.state && this.data.state.sessionId) || "default";
        const cache = JSON.parse(localStorage.getItem(STORAGE_KEY_VOTED_CACHE) || "{}");
        if (!cache[sessionKey]) cache[sessionKey] = {};
        cache[sessionKey][questionId] = choice;
        localStorage.setItem(STORAGE_KEY_VOTED_CACHE, JSON.stringify(cache));
      } catch (e) {}
    }

    async submitVote(questionId, choice) {
      if (!["autor", "ia"].includes(choice)) return;
      const voterId = this.getDeviceId();
      const votePayload = { choice, ts: Date.now() };

      this._saveDeviceVoteToCache(questionId, choice);

      if (!this.data.votes[questionId]) this.data.votes[questionId] = {};
      this.data.votes[questionId][voterId] = votePayload;
      this._notify();

      if (this.mode === "firebase" && this.restBaseUrl) {
        await fetch(`${this.restBaseUrl}/votes/${questionId}/${voterId}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(votePayload)
        });
      } else {
        this._saveToLocalStorage();
      }
    }

    async updateState(partialState) {
      const nextState = {
        ...(this.data.state || DEFAULT_SESSION_STATE),
        ...partialState,
        updatedAt: Date.now()
      };
      this.data.state = nextState;
      this._notify();

      if (this.mode === "firebase" && this.restBaseUrl) {
        await fetch(`${this.restBaseUrl}/state.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextState)
        });
      } else {
        this._saveToLocalStorage();
      }
    }

    async resetEntireSession() {
      const newSessionId = "sess_" + Date.now().toString(36);
      const freshState = {
        status: STATES.RESULTS,
        sessionId: newSessionId,
        updatedAt: Date.now()
      };

      try {
        localStorage.removeItem(STORAGE_KEY_VOTED_CACHE);
      } catch (e) {}

      this.data.state = freshState;
      this.data.votes = {};
      this._notify();

      if (this.mode === "firebase" && this.restBaseUrl) {
        await fetch(`${this.restBaseUrl}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: freshState })
        });
      } else {
        this._saveToLocalStorage();
      }
    }

    async simulateAllQuestionsVotes(votersCount = 25) {
      const questions = this.getQuestions();
      const allVotes = { ...(this.data.votes || {}) };
      const biases = [0.64, 0.72, 0.56, 0.80, 0.68, 0.52];

      questions.forEach((q, idx) => {
        if (!allVotes[q.id]) allVotes[q.id] = {};
        const correctChoice = q.correct === "ia" ? "ia" : "autor";
        const wrongChoice = correctChoice === "autor" ? "ia" : "autor";
        const bias = biases[idx % biases.length];

        for (let i = 0; i < votersCount; i++) {
          const botId = `sim_${idx}_${i}_${Math.random().toString(36).substring(2, 6)}`;
          const choice = Math.random() < bias ? correctChoice : wrongChoice;
          allVotes[q.id][botId] = { choice, simulated: true, ts: Date.now() };
        }
      });

      this.data.votes = allVotes;
      this._notify();

      if (this.mode === "firebase" && this.restBaseUrl) {
        await fetch(`${this.restBaseUrl}/votes.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(allVotes)
        });
      } else {
        this._saveToLocalStorage();
      }
    }
  }

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
      } catch (e) {}
    }

    const img = document.createElement("img");
    img.alt = "Código QR";
    img.width = size;
    img.height = size;
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(text)}`;
    containerEl.appendChild(img);
  }

  window.AIT = {
    STATES,
    FIXED_PARTICIPANT_URL,
    engine: new GameSyncEngine(),
    renderQRCode
  };
})();
