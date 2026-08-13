// In-browser audio recording for the Contribute page.
// Uses the MediaRecorder API (needs https:// or localhost). Records a clip,
// lets you listen / re-record, then POSTs it to /api/contribute-audio.

(function () {
  "use strict";

  var mediaRecorder = null;
  var chunks = [];
  var audioBlob = null;
  var audioExt = "webm";

  // Commons accepts ogg/opus and webm; pick whichever this browser can record.
  var RECORD_TYPES = [
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" }
  ];

  function pickRecordType() {
    for (var i = 0; i < RECORD_TYPES.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported &&
          MediaRecorder.isTypeSupported(RECORD_TYPES[i].mime)) {
        return RECORD_TYPES[i];
      }
    }
    return { mime: "", ext: "webm" };   // let the browser choose its default
  }

  var $start = document.getElementById("rec-start");
  var $stop = document.getElementById("rec-stop");
  var $again = document.getElementById("rec-again");
  var $submit = document.getElementById("rec-submit");
  var $audio = document.getElementById("rec-audio");
  var $playback = document.getElementById("rec-playback");
  var $indicator = document.getElementById("rec-indicator");
  var $status = document.getElementById("rec-status");
  var $lang = document.getElementById("rec-lang");
  var $word = document.getElementById("rec-word");

  // Prefill language from URL param, or fall back to the learner's target language.
  // The app stores state under wikilinkua_state_v2; wikilinkua_progress is the
  // pre-v2 format, still read here for browsers that haven't migrated yet.
  var prefillQid = window.WL_PREFILL && window.WL_PREFILL.qid;
  if (!prefillQid) {
    try {
      var state = JSON.parse(localStorage.getItem("wikilinkua_state_v2") || "null");
      if (state && state.activeProfile) {
        prefillQid = state.activeProfile.targetLang;
      } else {
        var legacy = JSON.parse(localStorage.getItem("wikilinkua_progress") || "{}");
        prefillQid = legacy.profile && legacy.profile.targetLang;
      }
    } catch (e) {}
  }
  if (prefillQid) {
    for (var i = 0; i < $lang.options.length; i++) {
      if ($lang.options[i].value.split("|")[0] === prefillQid) {
        $lang.selectedIndex = i;
        break;
      }
    }
  }

  // Tell the user up front whether this session can upload at all, instead of
  // letting them record a clip and only then hit a permission error.
  (function checkUploadPermission() {
    fetch("/api/upload-check", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || d.canUpload) return;
        var box = document.createElement("div");
        box.style.cssText =
          "margin:0 0 16px;padding:12px 14px;border-radius:2px;font-size:0.88rem;" +
          "line-height:1.5;background:#fef6e7;border:1px solid #f2d9a0;color:#54595d";
        var msg = document.createElement("div");
        msg.textContent = d.reason || "Uploading is not available for this session.";
        box.appendChild(msg);

        if (d.loggedIn && !d.devLogin) {
          var form = document.createElement("form");
          form.method = "post";
          form.action = "/logout";
          form.style.marginTop = "8px";
          var btn = document.createElement("button");
          btn.type = "submit";
          btn.textContent = "Log out and log in again";
          btn.style.cssText =
            "background:#3366cc;color:#fff;border:none;border-radius:2px;" +
            "padding:6px 12px;font-weight:600;cursor:pointer;font-family:inherit";
          form.appendChild(btn);
          box.appendChild(form);
        }

        var detail = document.createElement("div");
        detail.style.cssText = "margin-top:8px;font-size:0.78rem;color:#72777d";
        detail.textContent = "consumer " + (d.clientId || "?")
          + (d.scopes ? " · scopes: " + d.scopes : "")
          + (d.apiError ? " · API: " + d.apiError : "");
        box.appendChild(detail);

        var card = document.querySelector(".wl-card");
        if (card && card.parentNode) card.parentNode.insertBefore(box, card);
      })
      .catch(function () { /* diagnostics are best-effort */ });
  })();

  function setStatus(msg, kind) {
    $status.textContent = msg || "";
    $status.style.color = kind === "danger" ? "#d73333" : kind === "success" ? "#14866d" : "#54595d";
  }

  $start.addEventListener("click", async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Your browser can't record audio here (needs HTTPS or localhost).", "danger");
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      var recordType = pickRecordType();
      audioExt = recordType.ext;
      mediaRecorder = recordType.mime
        ? new MediaRecorder(stream, { mimeType: recordType.mime })
        : new MediaRecorder(stream);
      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = function () {
        audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType || recordType.mime || "audio/webm" });
        $audio.src = URL.createObjectURL(audioBlob);
        $playback.style.display = "block";
        $submit.disabled = false;
        stream.getTracks().forEach(function (t) { t.stop(); });  // release mic
      };
      mediaRecorder.start();
      $start.disabled = true;
      $stop.disabled = false;
      $submit.disabled = true;
      $indicator.innerHTML = '<span class="rec-dot rec-pulse"></span>recording…';
      setStatus("");
    } catch (err) {
      setStatus("Couldn't access the microphone: " + err.message, "danger");
    }
  });

  $stop.addEventListener("click", function () {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    $start.disabled = false;
    $stop.disabled = true;
    $indicator.textContent = "";
  });

  $again.addEventListener("click", function () {
    audioBlob = null;
    $playback.style.display = "none";
    $submit.disabled = true;
    setStatus("");
  });

  $submit.addEventListener("click", async function () {
    var word = ($word.value || "").trim();
    if (!audioBlob) { setStatus("Record a clip first.", "danger"); return; }
    if (!word) { setStatus("Enter the word you recorded.", "danger"); return; }

    var parts = $lang.value.split("|");
    var fd = new FormData();
    fd.append("audio", audioBlob, "clip." + audioExt);
    fd.append("word", word);
    fd.append("qid", parts[0]);
    fd.append("code", parts[1]);
    fd.append("lang", $lang.options[$lang.selectedIndex].textContent.replace(/\s*\(.*\)$/, ""));
    if (window.WL_PREFILL && window.WL_PREFILL.lexeme) {
      fd.append("lexeme", window.WL_PREFILL.lexeme);
    }

    $submit.disabled = true;
    setStatus("Uploading…", "muted");
    try {
      var res = await fetch("/api/contribute-audio", { method: "POST", body: fd });
      var data = await res.json();
      if (data.ok) {
        $status.textContent = "";
        var span = document.createElement("span");
        span.style.color = "#14866d";
        span.textContent = "✔ " + (data.message || "");
        $status.appendChild(span);
        if (data.url) {
          var a = document.createElement("a");
          a.href = data.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = " View on Commons";
          $status.appendChild(a);
        }
      } else {
        setStatus(data.message || "Upload failed.", "warning");
        $submit.disabled = false;
      }
    } catch (err) {
      setStatus("Network error: " + err.message, "danger");
      $submit.disabled = false;
    }
  });
})();
