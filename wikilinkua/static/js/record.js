// In-browser audio recording for the Contribute page.
// Uses the MediaRecorder API (needs https:// or localhost). Records a clip,
// lets you listen / re-record, then POSTs it to /api/contribute-audio.

(function () {
  "use strict";

  var mediaRecorder = null;
  var chunks = [];
  var audioBlob = null;

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
  var prefillQid = window.WL_PREFILL && window.WL_PREFILL.qid;
  if (!prefillQid) {
    try {
      var stored = JSON.parse(localStorage.getItem("wikilinkua_progress") || "{}");
      prefillQid = stored.profile && stored.profile.targetLang;
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
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = function () {
        audioBlob = new Blob(chunks, { type: "audio/webm" });
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
    fd.append("audio", audioBlob, "clip.webm");
    fd.append("word", word);
    fd.append("qid", parts[0]);
    fd.append("code", parts[1]);
    fd.append("lang", $lang.options[$lang.selectedIndex].textContent.replace(/\s*\(.*\)$/, ""));

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
