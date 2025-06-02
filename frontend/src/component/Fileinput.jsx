import "../style/fileinput.css";
import { createPortal } from "react-dom";
import { useEffect, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import cloudBlenderLogo from "../assets/icons/cloud-blender-render-logo.svg";
import addFile from "../assets/icons/file-upload.svg";
import deleteIcon from "../assets/icons/trash.svg"

export default function Fileinput() {
  const [is_dragging, set_is_dragging] = useState(false);
  const [progress_bar_status, set_progress_bar_status] = useState(false);
  const [file_btn, set_file_btn] = useState(false);
  const [blend_file_name, set_blend_file_name] = useState("");

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

  const onDrop = useCallback((acceptFiles) => {
    console.log(acceptFiles[0].name);
    // set_progress_bar_status(true);
    set_blend_file_name(acceptFiles[0].name);
    set_file_btn(true);
  }, []);

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
    <div  className={`file-input-parent ${!!file_btn && 'file-input-parent-toggle'}`} >
      {!!is_dragging && <Overlay />}

      {!!file_btn ? (
        <FileBtn blend_file_name={blend_file_name} />
      ) : (
        <Inputbox
          getInputProps={getInputProps}
          getRootProps={getRootProps}
          progress_bar_status={progress_bar_status}
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
          <img src={addFile} alt="file-upload-icon" />
          <p className="file-upload-label">
            Click or drag and drop your blend file
          </p>
          <p className="max-size-limit">(Max File size: 20 GB)</p>
        </div>
        {progress_bar_status && <div className="upload-progressbar"></div>}
      </div>
    </>
  );
};

const FileBtn = ({ blend_file_name }) => {

  const [hover_state, set_hover_state] = useState(false)

  const hover_enter = () => {
    set_hover_state(true)

  }

  const hover_leave = () => {
    set_hover_state(false)
  }
  

  return (
    <>
      <>
        <button  className="file-button-parent" onMouseEnter={hover_enter} onMouseLeave={hover_leave} >
          {hover_state ? <img src={deleteIcon} alt="trash-icon" /> : <p>{blend_file_name}</p>}
          
        </button>
      </>
    </>
  );
};
