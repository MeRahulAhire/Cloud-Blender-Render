import "../style/fileinput.css";
import { createPortal } from "react-dom";
import { useEffect, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import cloudBlenderLogo from "../assets/icons/cloud-blender-render-logo.svg";
import addFile from "../assets/icons/file-upload.svg";
import deleteIcon from "../assets/icons/trash.svg";
import central_store from "./Store";
import axios from "axios";
import pLimit from "p-limit";

// ─── Speed tracker ─────────────────────────────────────────────────────────────
// 15s window so random bursts don't violently change concurrency

function createSpeedTracker(window_ms = 15000) {
  const samples = []; // { t: DOMHighResTimeStamp, bytes: number }

  return {
    recordBytes(bytes) {
      const now = performance.now();
      samples.push({ t: now, bytes });
      while (samples.length && now - samples[0].t > window_ms) {
        samples.shift();
      }
    },

    getSpeedMBps() {
      if (samples.length < 2) return 0;
      const now    = performance.now();
      const recent = samples.filter((s) => s.t >= now - window_ms);
      if (recent.length < 2) return 0;

      const totalBytes = recent.reduce((sum, s) => sum + s.bytes, 0);
      const elapsed_ms = recent[recent.length - 1].t - recent[0].t;
      if (elapsed_ms === 0) return 0;

      return (totalBytes / elapsed_ms) / 1024; // bytes/ms → MB/s
    },

    // On retry: inject zero-speed samples so the average drops and concurrency cools
    penalise() {
      const now = performance.now();
      for (let i = 0; i < 5; i++) {
        samples.push({ t: now - i * 100, bytes: 0 });
      }
    },
  };
}

// ─── Concurrency mapping ───────────────────────────────────────────────────────
// < 1 MB/s → 1, 1 MB/s → 1, 2 → 2 ... 5 → 5, 6+ → 6

function getConcurrency(speedMBps) {
  if (speedMBps < 1)  return 1;
  if (speedMBps >= 6) return 6;
  return Math.floor(speedMBps);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Fileinput() {
  const fetch_data            = central_store((state) => state.fetch_data);
  const blend_file            = central_store((state) => state.blend_file);
  const upload_percentage     = central_store((state) => state.upload_percentage);
  const set_upload_percentage = central_store((state) => state.set_upload_percentage);
  const render_status         = central_store((state) => state.render_status.is_rendering);
  const base_url              = central_store((state) => state.base_url);
  const settings_box          = central_store((state) => state.settings_box);

  const [is_dragging, set_is_dragging] = useState(false);
  const [zip_message, set_zip_message] = useState("");
  const [speed_label, set_speed_label] = useState(""); // "2.4 MB/s · 2 parallel"

  const onDropRejected = (fileRejections) => {
    fileRejections.forEach((rejection) => {
      console.error("Rejected file:", rejection.file.name);
      rejection.errors.forEach((e) => console.error(e.code, e.message));
    });
  };

  const onDrop = useCallback(
    async (acceptFiles) => {
      const file      = acceptFiles[0];
      const isZipFile = file.name.toLowerCase().endsWith(".zip");

      let CHUNK_SIZE;
      if      (file.size < 50  * 1024 * 1024)  CHUNK_SIZE = 5  * 1024 * 1024;
      else if (file.size < 500 * 1024 * 1024)  CHUNK_SIZE = 10 * 1024 * 1024;
      else                                       CHUNK_SIZE = 15 * 1024 * 1024;

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const fileId      = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const MAX_RETRIES = 3;

      set_upload_percentage(0);
      set_zip_message("");
      set_speed_label("");

      // ── Chunk state table ───────────────────────────────────────────────────
      const chunkStatus = Array.from({ length: totalChunks }, (_, index) => ({
        index,
        status:   "pending",
        retries:  0,
        response: null,
        inFlight: 0,  // bytes currently in-flight for this slot
      }));

      // ── Byte-accurate progress ──────────────────────────────────────────────
      const updateProgress = () => {
        const confirmedBytes = chunkStatus
          .filter((c) => c.status === "success")
          .length * CHUNK_SIZE;
        const inFlightBytes = chunkStatus.reduce((sum, c) => sum + c.inFlight, 0);
        const pct = Math.min(
          99,
          Math.round(((confirmedBytes + inFlightBytes) * 100) / file.size)
        );
        set_upload_percentage(pct);

        if (isZipFile && pct > 95) {
          set_zip_message("Extracting zip file... Please wait");
        }
      };

      // ── Speed tracker + limiter (created once per upload) ──────────────────
      const tracker            = createSpeedTracker(15000);
      let   currentConcurrency = 1;
      let   limiter            = pLimit(1); // always start at 1

      const syncLimiter = () => {
        const speedMBps = tracker.getSpeedMBps();
        const desired   = getConcurrency(speedMBps);

        if (desired !== currentConcurrency) {
          console.log(
            `[upload] ${speedMBps.toFixed(2)} MB/s → concurrency ${currentConcurrency} → ${desired}`
          );
          currentConcurrency = desired;
          limiter = pLimit(desired);
          // Note: tasks already in-flight under the old limiter complete normally.
          // New tasks scheduled after this point pick up the new limit.
        }

        if (speedMBps > 0) {
          set_speed_label(`${speedMBps.toFixed(2)} MB/s`);
        }
      };

      // ── Single chunk upload ─────────────────────────────────────────────────
      const uploadChunk = async (chunkIndex) => {
        const start      = chunkIndex * CHUNK_SIZE;
        const end        = Math.min(start + CHUNK_SIZE, file.size);
        const chunk      = file.slice(start, end);
        const chunkBytes = end - start;

        const formData = new FormData();
        formData.append("file",         chunk);
        formData.append("chunk_index",  chunkIndex.toString());
        formData.append("total_chunks", totalChunks.toString());
        formData.append("file_name",    file.name);
        formData.append("file_id",      fileId);

        chunkStatus[chunkIndex].status   = "uploading";
        chunkStatus[chunkIndex].inFlight = 0;

        // Adaptive timeout: 3× expected duration at current speed, 90s floor.
        // At 100 KB/s a 5MB chunk takes ~50s — the 90s floor keeps it safe.
        const speedBytesPerMs = Math.max(
          (tracker.getSpeedMBps() * 1024 * 1024) / 1000,
          500 / 1000  // absolute floor: 500 B/s
        );
        const adaptTimeout = Math.max(90_000, (chunkBytes / speedBytesPerMs) * 3);

        let prevLoaded = 0;

        try {
          const response = await axios.post(
            `${base_url}/upload_blend_file`,
            formData,
            {
              headers:         { "Content-Type": "multipart/form-data" },
              withCredentials: true,
              timeout:         adaptTimeout,
              onUploadProgress: (evt) => {
                if (!evt.lengthComputable) return;

                // Record only the delta since the last tick — avoids double-counting
                const delta = evt.loaded - prevLoaded;
                prevLoaded  = evt.loaded;

                tracker.recordBytes(delta);
                syncLimiter();

                chunkStatus[chunkIndex].inFlight = evt.loaded;
                updateProgress();
              },
            }
          );

          chunkStatus[chunkIndex].status   = "success";
          chunkStatus[chunkIndex].response = response;
          chunkStatus[chunkIndex].inFlight = 0;
          updateProgress();

          return response;
        } catch (error) {
          console.error(`❌ Chunk ${chunkIndex} failed:`, error.message);
          chunkStatus[chunkIndex].status   = "failed";
          chunkStatus[chunkIndex].inFlight = 0;
          chunkStatus[chunkIndex].retries++;
          updateProgress();
          throw error;
        }
      };

      // ── Retry wrapper ───────────────────────────────────────────────────────
      const uploadChunkWithRetry = async (chunkIndex) => {
        let lastError;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`🔄 Retrying chunk ${chunkIndex}, attempt ${attempt}/${MAX_RETRIES}`);

              // Penalise speed → syncLimiter will drop concurrency toward 1
              tracker.penalise();
              syncLimiter();

              // Backoff: 3s → 6s → 12s (better for mobile than 1/2/4s)
              await new Promise((r) =>
                setTimeout(r, 3000 * Math.pow(2, attempt - 1))
              );
            }

            return await uploadChunk(chunkIndex);
          } catch (error) {
            lastError = error;

            if (error.response?.status === 400 || error.response?.status === 415) {
              throw error; // hard fail, no retry
            }

            if (attempt === MAX_RETRIES) {
              console.error(`❌ Chunk ${chunkIndex} exhausted retries`);
              throw error;
            }
          }
        }

        throw lastError;
      };

      // ── Orchestration ───────────────────────────────────────────────────────
      try {
        // Chunk 0 always sequential — establishes the server-side session
        console.log("📤 Chunk 0 → establishing session...");
        await uploadChunkWithRetry(0);

        if (totalChunks === 1) {
          set_upload_percentage(100);
          set_speed_label("");
          fetch_data();
          return;
        }

        console.log(`📤 Remaining ${totalChunks - 1} chunks (adaptive concurrency)...`);

        // Each task closes over `limiter` by reference. When syncLimiter rebuilds
        // it, the NEXT task to be scheduled picks up the new limit automatically.
        const remainingPromises = Array.from(
          { length: totalChunks - 1 },
          (_, i) => {
            const chunkIndex = i + 1;
            return (() => limiter(() => uploadChunkWithRetry(chunkIndex)))();
          }
        );

        await Promise.all(remainingPromises);

        const failedChunks = chunkStatus.filter((c) => c.status !== "success");
        if (failedChunks.length > 0) {
          throw new Error(`${failedChunks.length} chunks failed`);
        }

        console.log("✅ All chunks uploaded");
        set_upload_percentage(100);
        set_speed_label("");

        const completionResponse = chunkStatus.find(
          (c) => c.response?.status === 200
        )?.response;

        if (completionResponse) {
          const msg = completionResponse.data;
          console.log("✅ Server response:", msg);
          if (isZipFile) set_zip_message("Extracting zip file... Please wait");
          fetch_data();
          set_zip_message("");
        } else {
          console.log("⏳ Waiting for server assembly...");
          await new Promise((r) => setTimeout(r, 1000));
          fetch_data();
        }
      } catch (error) {
        console.error("❌ Upload failed:", error);
        set_upload_percentage(0);
        set_speed_label("");
        fetch_data();
      }
    },
    [base_url, set_upload_percentage, fetch_data]
  );

  // ── Dropzone ────────────────────────────────────────────────────────────────

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: false,
    accept: {
      "application/x-blender": [".blend"],
      "application/zip":       [".zip"],
    },
    disabled: !!settings_box || !!blend_file.is_present,
    noClick:  !!settings_box || !!blend_file.is_present,
    noDrag:   !!settings_box || !!blend_file.is_present,
  });

  // ── Global drag/drop listeners ──────────────────────────────────────────────

  useEffect(() => {
    const handle_drag_enter = (e) => {
      e.preventDefault();
      if (!settings_box && !blend_file.is_present) set_is_dragging(true);
    };
    const handle_drag_leave = (e) => {
      e.preventDefault();
      if (e.relatedTarget === null) set_is_dragging(false);
    };
    const handle_drag_over = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handle_drop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      set_is_dragging(false);
      if (settings_box || blend_file.is_present) return;
      if (e.dataTransfer?.files?.length > 0) {
        onDrop([e.dataTransfer.files[0]]);
        e.dataTransfer.clearData();
      }
    };

    window.addEventListener("dragenter", handle_drag_enter);
    window.addEventListener("dragleave", handle_drag_leave);
    window.addEventListener("dragover",  handle_drag_over);
    window.addEventListener("drop",      handle_drop);

    return () => {
      window.removeEventListener("dragenter", handle_drag_enter);
      window.removeEventListener("dragleave", handle_drag_leave);
      window.removeEventListener("dragover",  handle_drag_over);
      window.removeEventListener("drop",      handle_drop);
    };
  }, [onDrop, settings_box, blend_file.is_present]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={`file-input-parent ${
        !!blend_file.is_present && "file-input-parent-toggle"
      }`}
    >
      {!!is_dragging && !settings_box && !blend_file.is_present && <Overlay />}

      {!!blend_file.is_present ? (
        <FileBtn
          blend_file_name={blend_file.file_name}
          fetch_data={fetch_data}
          base_url={base_url}
          set_upload_percentage={set_upload_percentage}
          render_status={render_status}
        />
      ) : (
        <Inputbox
          getInputProps={getInputProps}
          getRootProps={getRootProps}
          progress_bar_status={upload_percentage}
          zip_message={zip_message}
          speed_label={speed_label}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

const Overlay = () =>
  createPortal(
    <div className="file-drag-drop-overlay">
      <div className="dragdrop-border">
        <div className="dragdrop-infocontext">
          <img src={cloudBlenderLogo} alt="logo-svg" />
          <p>Drag and drop your blend or zip file here</p>
        </div>
      </div>
    </div>,
    document.getElementById("dragdrop")
  );

const Inputbox = ({
  getInputProps,
  getRootProps,
  progress_bar_status,
  zip_message,
  speed_label,
}) => (
  <div {...getRootProps()} className="cp-inputbox">
    <input {...getInputProps()} />
    <div className="inputbox-item-container">
      <img src={addFile} draggable="false" alt="file-upload-icon" />
      <p className="file-upload-label">
        Click or drag and drop your blend or zip file
      </p>
      {/* zip_message takes priority (extraction phase), otherwise show speed */}
      <p className="zip-status">{zip_message || speed_label}</p>
    </div>
    <div
      className="upload-progressbar"
      style={{ width: `${progress_bar_status}%` }}
    />
  </div>
);

const FileBtn = ({
  blend_file_name,
  fetch_data,
  base_url,
  set_upload_percentage,
  render_status,
}) => {
  const [hover_state, set_hover_state] = useState(false);

  const delete_blend_file = () => {
    if (!render_status) {
      axios
        .post(`${base_url}/delete_blend_file`, {}, { withCredentials: true })
        .then((res) => {
          if (res.status === 200) {
            set_upload_percentage(0);
            fetch_data();
          }
        })
        .catch((err) => {
          console.log(err);
          fetch_data();
        });
    }
  };

  return (
    <button
      className={`file-button-parent ${!!render_status ? "dim-opacity" : ""}`}
      onMouseEnter={() => { if (!render_status) set_hover_state(true);  }}
      onMouseLeave={() => { if (!render_status) set_hover_state(false); }}
      onClick={delete_blend_file}
    >
      {hover_state
        ? <img src={deleteIcon} alt="trash-icon" />
        : <p>{blend_file_name}</p>
      }
    </button>
  );
};