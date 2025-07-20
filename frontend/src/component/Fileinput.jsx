import "../style/fileinput.css";
import { createPortal } from "react-dom";
import { useEffect, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import cloudBlenderLogo from "../assets/icons/cloud-blender-render-logo.svg";
import addFile from "../assets/icons/file-upload.svg";
import deleteIcon from "../assets/icons/trash.svg";
import central_store from "./Store";
import axios from "axios";

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
  const [is_dragging, set_is_dragging] = useState(false);

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
  //   (acceptFiles) => {
  //     const file = acceptFiles[0];
  //     const formData = new FormData();
  //     formData.append("file", file);

  //     axios
  //       .post(`${base_url}/upload_blend_file`, formData, {
  //         headers: {
  //           "Content-Type": "multipart/form-data",
  //         },
  //         onUploadProgress: (progressEvent) => {
  //           const percentage = Math.round(
  //             (progressEvent.loaded * 100) / progressEvent.total
  //           );
  //           set_upload_percentage(percentage);
  //         },
  //         withCredentials : true,
  //       })
  //       .then((res) => {
  //         if (res.status === 200) {
  //           fetch_data();
  //         }
  //       })
  //       .catch((err) => {
  //         console.error("Upload failed", err);
  //         set_upload_percentage(0);
  //         fetch_data();
  //       });

  //     // console.log(acceptFiles[0].name);
  //     // console.log(blend_file);
  //     // set_progress_bar_status(true);
  //     // set_blend_file_name(acceptFiles[0].name);
  //     // set_file_btn(true);
  //   },
  //   [set_upload_percentage]
  // );

  const onDrop = useCallback(
    async (acceptFiles) => {
      const file = acceptFiles[0];
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      
      // Generate unique file_id for this upload session
      const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      
      let uploadedChunks = 0;
      
      try {
        // Reset upload percentage at start
        set_upload_percentage(0);
        
        // Upload chunks sequentially
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          
          const formData = new FormData();
          formData.append("file", chunk);
          formData.append("chunk_index", chunkIndex.toString());
          formData.append("total_chunks", totalChunks.toString());
          formData.append("file_name", file.name);
          formData.append("file_id", fileId);
          
          try {
            const response = await axios.post(`${base_url}/upload_blend_file`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
              withCredentials: true,
            });
            
            uploadedChunks++;
            
            // Update progress based on chunks uploaded
            const percentage = Math.round((uploadedChunks * 100) / totalChunks);
            set_upload_percentage(percentage);
            
            // Check if upload is complete (status 200) or continuing (status 202)
            if (response.status === 200) {
              // Upload completed successfully
              console.log("Upload completed successfully");
              fetch_data();
              return;
            } else if (response.status === 202) {
              // Chunk uploaded, continue with next chunk
              // console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded`);
            }
            
          } catch (chunkError) {
            console.error(`Failed to upload chunk ${chunkIndex}:`, chunkError);
            
            // If it's a session validation error (400), restart is needed
            if (chunkError.response?.status === 400) {
              console.error("Upload session invalid, restart required");
              set_upload_percentage(0);
              fetch_data();
              return;
            }
            
            // For other errors, also reset and refresh data
            set_upload_percentage(0);
            fetch_data();
            return;
          }
        }
        
      } catch (error) {
        console.error("Upload failed:", error);
        set_upload_percentage(0);
        fetch_data();
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
    },
    maxSize: 20 * 1024 * 1024 * 1024,
  });

  useEffect(() => {
    const handle_drag_enter = (e) => {
      e.preventDefault();
      set_is_dragging(true);
    };

    const handle_drag_leave = (e) => {
      e.preventDefault();
      //   setIsDragging(false);

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

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0]; // Only use the first file
        onDrop([droppedFile]);
        e.dataTransfer.clearData();
      }
    };

    const window_listner = () => {
      window.addEventListener("dragenter", handle_drag_enter);
      window.addEventListener("dragleave", handle_drag_leave);
      window.addEventListener("dragover", handle_drag_over);
      window.addEventListener("drop", handle_drop);
    };

    window_listner();

    return () => {
      window_listner();
    };
  }, [onDrop]);

  return (
    <div
      className={`file-input-parent ${
        !!blend_file.is_present && "file-input-parent-toggle"
      }`}
    >
      {!!is_dragging && !blend_file.is_present && <Overlay />}

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
            <p>Drag and drop your blend file here</p>
          </div>
        </div>
      </div>
    </>,
    document.getElementById("dragdrop")
  );
};

const Inputbox = ({ getInputProps, getRootProps, progress_bar_status }) => {
  return (
    <>
      <div {...getRootProps()} className="cp-inputbox">
        <input {...getInputProps()} />
        <div className="inputbox-item-container">
          <img src={addFile} draggable="false" alt="file-upload-icon" />
          <p className="file-upload-label">
            Click or drag and drop your blend file
          </p>
          <p className="max-size-limit">(Max File size: 20 GB)</p>
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
