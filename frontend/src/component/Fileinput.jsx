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

export default function Fileinput() {
  const fetch_data = central_store((state) => state.fetch_data);
  const blend_file = central_store((state) => state.blend_file);
  const upload_percentage = central_store((state) => state.upload_percentage);
  const set_upload_percentage = central_store(
    (state) => state.set_upload_percentage
  );
  const render_status = central_store(
    (state) => state.render_status.is_rendering
  );
  const base_url = central_store((state) => state.base_url);
  const settings_box = central_store((state) => state.settings_box);
  const [is_dragging, set_is_dragging] = useState(false);
  const [zip_message, set_zip_message] = useState("");
  

  const onDropRejected = (fileRejections) => {
    set_progress_bar_status(false);
    set_file_btn(false);
    fileRejections.forEach((rejection) => {
      console.error("Rejected file:", rejection.file.name);
      rejection.errors.forEach((e) => {
        console.error(e.code, e.message);
      });
    });
  };


  // const onDrop = useCallback(
  //   async (acceptFiles) => {
  //     const file = acceptFiles[0];
  //     const CHUNK_SIZE = 5 * 1024 * 1024;
  //     const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  //     const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  
  //     set_upload_percentage(0);
  
  //     try {
  //       // First, send chunk 0 to establish session
  //       const firstChunk = file.slice(0, Math.min(CHUNK_SIZE, file.size));
  //       const firstFormData = new FormData();
  //       firstFormData.append("file", firstChunk);
  //       firstFormData.append("chunk_index", "0");
  //       firstFormData.append("total_chunks", totalChunks.toString());
  //       firstFormData.append("file_name", file.name);
  //       firstFormData.append("file_id", fileId);
  
  //       const firstResponse = await axios.post(`${base_url}/upload_blend_file`, firstFormData, {
  //         headers: { "Content-Type": "multipart/form-data" },
  //         withCredentials: true,
  //       });
  
  //       let uploadedChunks = 1;
  //       set_upload_percentage(Math.round((1 * 100) / totalChunks));
  
  //       // If only one chunk, handle the response
  //       if (totalChunks === 1) {
  //         const responseMessage = firstResponse.data;
          
  //         // Check if it's a zip file that was extracted
  //         if (responseMessage === "Zip file uploaded and extracted successfully") {
  //           window.location.reload();
  //         } else {
  //           fetch_data();
  //         }
  //         return;
  //       }
  
  //       // Now send remaining chunks in parallel
  //       const limit = pLimit(10);
  //       const remainingPromises = Array.from({ length: totalChunks - 1 }, (_, i) => {
  //         const chunkIndex = i + 1;
  //         return limit(async () => {
  //           const start = chunkIndex * CHUNK_SIZE;
  //           const end = Math.min(start + CHUNK_SIZE, file.size);
  //           const chunk = file.slice(start, end);
  
  //           const formData = new FormData();
  //           formData.append("file", chunk);
  //           formData.append("chunk_index", chunkIndex.toString());
  //           formData.append("total_chunks", totalChunks.toString());
  //           formData.append("file_name", file.name);
  //           formData.append("file_id", fileId);
  
  //           const response = await axios.post(`${base_url}/upload_blend_file`, formData, {
  //             headers: { "Content-Type": "multipart/form-data" },
  //             withCredentials: true,
  //           });
  
  //           uploadedChunks++;
  //           const percentage = Math.round((uploadedChunks * 100) / totalChunks);
  //           set_upload_percentage(percentage);
  
  //           return response;
  //         });
  //       });
  
  //       const responses = await Promise.all(remainingPromises);
        
  //       // Get the last response (which will be the final chunk that triggers assembly)
  //       const lastResponse = responses[responses.length - 1];
  //       const responseMessage = lastResponse.data;
  
  //       // Check if it's a zip file that was extracted
  //       if (responseMessage === "Zip file uploaded and extracted successfully") {
  //         window.location.reload();
  //       } else {
  //         fetch_data();
  //       }
  
  //     } catch (error) {
  //       console.error("❌ Upload failed:", error);
  //       set_upload_percentage(0);
  //       fetch_data();
  //     }
  //   },
  //   [base_url, set_upload_percentage, fetch_data]
  // );

  const onDrop = useCallback(
    async (acceptFiles) => {
      const file = acceptFiles[0];
      const isZipFile = file.name.toLowerCase().endsWith('.zip');

      // Optimize chunk size for Cloudflare tunnel + server processing
      // 10-15MB balances throughput with responsive server confirmations
      let CHUNK_SIZE;
      if (file.size < 50 * 1024 * 1024) { // < 50MB
        CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
      } else if (file.size < 500 * 1024 * 1024) { // < 500MB
        CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks - sweet spot
      } else {
        CHUNK_SIZE = 15 * 1024 * 1024; // 15MB chunks for large files
      }
      
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const MAX_RETRIES = 3;
      const TIMEOUT = 60000; // 60 seconds for larger chunks
  
      set_upload_percentage(0);
      set_zip_message("");
  
      // Track status of each chunk
      const chunkStatus = new Array(totalChunks).fill(null).map((_, index) => ({
        index,
        status: 'pending', // pending, uploading, success, failed
        retries: 0,
        response: null,
      }));
  
      // Calculate and update overall progress based on server confirmations only
      const updateProgress = () => {
        // Only count chunks that have received 202 or 200 response from server
        const confirmedChunks = chunkStatus.filter(c => c.status === 'success').length;
        const percentage = Math.round((confirmedChunks * 100) / totalChunks);
        set_upload_percentage(percentage);

        // Show extraction message when zip upload reaches 100%
        if (isZipFile && percentage > 95) {
          set_zip_message("Extracting zip file... Please wait");
        }
      };
  
      const uploadChunk = async (chunkIndex) => {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
  
        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("chunk_index", chunkIndex.toString());
        formData.append("total_chunks", totalChunks.toString());
        formData.append("file_name", file.name);
        formData.append("file_id", fileId);
  
        chunkStatus[chunkIndex].status = 'uploading';
  
        try {
          const response = await axios.post(
            `${base_url}/upload_blend_file`, 
            formData, 
            {
              headers: { "Content-Type": "multipart/form-data" },
              withCredentials: true,
              timeout: TIMEOUT,
            }
          );
  
          // Mark as success only when server confirms receipt (202 or 200)
          chunkStatus[chunkIndex].status = 'success';
          chunkStatus[chunkIndex].response = response;
          
          // Update progress after server confirmation
          updateProgress();
  
          return response;
        } catch (error) {
          console.error(`❌ Chunk ${chunkIndex} failed:`, error.message);
          chunkStatus[chunkIndex].status = 'failed';
          chunkStatus[chunkIndex].retries++;
          updateProgress();
          throw error;
        }
      };
  
      const uploadChunkWithRetry = async (chunkIndex) => {
        let lastError;
        
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`🔄 Retrying chunk ${chunkIndex}, attempt ${attempt}/${MAX_RETRIES}`);
              // Exponential backoff: 1s, 2s, 4s
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
            }
            
            return await uploadChunk(chunkIndex);
          } catch (error) {
            lastError = error;
            
            // Don't retry on certain errors (e.g., 400, 415)
            if (error.response?.status === 400 || error.response?.status === 415) {
              console.error(`❌ Non-retryable error for chunk ${chunkIndex}:`, error.response.status);
              throw error;
            }
            
            if (attempt === MAX_RETRIES) {
              console.error(`❌ Chunk ${chunkIndex} failed after ${MAX_RETRIES} retries`);
              throw error;
            }
          }
        }
        
        throw lastError;
      };
  
      try {
        // Step 1: Upload chunk 0 FIRST to establish session (backend requirement)
        // Backend creates session metadata on chunk 0 and validates it for other chunks
        console.log("📤 Uploading chunk 0 to establish session...");
        await uploadChunkWithRetry(0);
  
        // If only one chunk, we're done
        if (totalChunks === 1) {
          const responseMessage = chunkStatus[0].response.data;
          if (responseMessage === "Zip file uploaded and extracted successfully") {
            fetch_data();
          } else {
            fetch_data();
          }
          return;
        }
  
        // Step 2: Upload remaining chunks with controlled concurrency
        // Max 6 concurrent uploads, but start next chunk as soon as any completes
        console.log(`📤 Uploading ${totalChunks - 1} remaining chunks (max 6 concurrent)...`);
        
        const limit = pLimit(6);
        
        const remainingPromises = Array.from({ length: totalChunks - 1 }, (_, i) => {
          const chunkIndex = i + 1;
          return limit(() => uploadChunkWithRetry(chunkIndex));
        });
  
        await Promise.all(remainingPromises);
  
        // Step 3: Verify all chunks were successful
        const failedChunks = chunkStatus.filter(c => c.status !== 'success');
        
        if (failedChunks.length > 0) {
          console.error("❌ Some chunks failed:", failedChunks.map(c => c.index));
          throw new Error(`${failedChunks.length} chunks failed to upload`);
        }
  
        console.log("✅ All chunks uploaded successfully");
  
        // Step 4: Find the final completion response (status 200)
        const completionResponse = chunkStatus.find(
          c => c.response?.status === 200
        )?.response;
  
        if (completionResponse) {
          const responseMessage = completionResponse.data;
          console.log("✅ Upload complete:", responseMessage);
          
          if (responseMessage === "Zip file uploaded and extracted successfully") {
            fetch_data();
            set_zip_message("");
          } else {
            fetch_data();
            set_zip_message("");
          }
        } else {
          // All chunks returned 202 (ACCEPTED) - this might happen on very fast networks
          // where the last chunk hasn't been processed yet. Wait a bit and fetch data.
          console.log("⏳ All chunks accepted, waiting for server processing...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          fetch_data();
        }
  
      } catch (error) {
        console.error("❌ Upload failed:", error);
        
        // Show detailed error information
        const failedChunks = chunkStatus.filter(c => c.status === 'failed');
        if (failedChunks.length > 0) {
          console.error("Failed chunks:", failedChunks.map(c => ({
            index: c.index,
            retries: c.retries
          })));
        }
        
        fetch_data();
        set_upload_percentage(0);
        
        // Optionally show error message to user
        // alert(`Upload failed. ${failedChunks.length} chunks could not be uploaded. Please try again.`);
      }
    },
    [base_url, set_upload_percentage, fetch_data]
  );



const { acceptFiles, getRootProps, getInputProps } = useDropzone({
  
  onDrop,
  onDropRejected,
  multiple: false,
  accept: {
    "application/x-blender": [".blend"],
    "application/zip": [".zip"],
  },
  disabled: !!settings_box || !!blend_file.is_present, 
  noClick: !!settings_box || !!blend_file.is_present, 
  noDrag: !!settings_box || !!blend_file.is_present, 
});

useEffect(() => {
  const handle_drag_enter = (e) => {
    e.preventDefault();
    
    // Only set dragging state if conditions allow upload
    if (!settings_box && !blend_file.is_present) {
      set_is_dragging(true);
    }
  };

  const handle_drag_leave = (e) => {
    e.preventDefault();

    if (e.relatedTarget === null) {
      set_is_dragging(false);
    }
  };

  const handle_drag_over = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handle_drop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    set_is_dragging(false);

    // Check conditions before allowing drop
    if (settings_box || blend_file.is_present) {
      return; // Don't process the drop if modal is open or file exists
    }

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]; // Only use the first file
      onDrop([droppedFile]);
      e.dataTransfer.clearData();
    }
  };

  window.addEventListener("dragenter", handle_drag_enter);
  window.addEventListener("dragleave", handle_drag_leave);
  window.addEventListener("dragover", handle_drag_over);
  window.addEventListener("drop", handle_drop);

  return () => {
    window.removeEventListener("dragenter", handle_drag_enter);
    window.removeEventListener("dragleave", handle_drag_leave);
    window.removeEventListener("dragover", handle_drag_over);
    window.removeEventListener("drop", handle_drop);
  };
}, [onDrop, settings_box, blend_file.is_present]); // Add dependencies here

  return (
    <div
      className={`file-input-parent ${
        !!blend_file.is_present && "file-input-parent-toggle"
      }`}
    >
      {!!is_dragging && !!!settings_box && !blend_file.is_present && <Overlay />}

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
        />
      )}
    </div>
  );
}

const Overlay = () => {
  return createPortal(
    <>
      <div className="file-drag-drop-overlay">
        <div className="dragdrop-border">
          <div className="dragdrop-infocontext">
            <img src={cloudBlenderLogo} alt="logo-svg" />
            <p>Drag and drop your blend or zip file here</p>
          </div>
        </div>
      </div>
    </>,
    document.getElementById("dragdrop")
  );
};

const Inputbox = ({ getInputProps, getRootProps, progress_bar_status, zip_message }) => {
  return (
    <>
      <div {...getRootProps()} className="cp-inputbox">
        <input {...getInputProps()} />
        <div className="inputbox-item-container">
          <img src={addFile} draggable="false" alt="file-upload-icon" />
          <p className="file-upload-label">
            Click or drag and drop your blend or zip file
          </p>
          <p className="zip-status">{zip_message}</p>
        </div>
        {
          <div
            className="upload-progressbar"
            style={{ width: `${progress_bar_status}%` }}
          ></div>
        }
      </div>
    </>
  );
};

const FileBtn = ({
  blend_file_name,
  fetch_data,
  base_url,
  set_upload_percentage,
  render_status,
}) => {
  const [hover_state, set_hover_state] = useState(false);

  const hover_enter = () => {
    if (render_status === false) {
      set_hover_state(true);
    }
  };

  const hover_leave = () => {
    if (render_status === false) {
      set_hover_state(false);
    }
  };
  const delete_blend_file = () => {
    if (render_status === false) {
      axios
        .post(`${base_url}/delete_blend_file`, {}, {withCredentials : true})
        .then((res) => {
          if (res.status === 200) {
            // console.log(upload_percentage)
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
    <>
      <>
        <button
          className={`file-button-parent ${
            !!render_status ? `dim-opacity` : ""
          }`}
          onMouseEnter={hover_enter}
          onMouseLeave={hover_leave}
          onClick={delete_blend_file}
        >
          {hover_state ? (
            <img src={deleteIcon} alt="trash-icon" />
          ) : (
            <p>{blend_file_name}</p>
          )}
        </button>
      </>
    </>
  );
};
