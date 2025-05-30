import "../style/fileinput.css";
import { createPortal } from "react-dom";
import { useEffect, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import CloudBlenderLogo from "../assets/icons/cloud-blender-render-logo.svg";

export default function Fileinput() {
  const [isDragging, setIsDragging] = useState(false);

  const onDropRejected = (fileRejections) => {
    fileRejections.forEach((rejection) => {
      console.error("Rejected file:", rejection.file.name);
      rejection.errors.forEach((e) => {
        console.error(e.code, e.message);
      });
    });
  };

  const onDrop = useCallback((acceptFiles) => {
    console.log(acceptFiles);
  }, []);

  const { acceptFiles, getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: false,
    accept: {
      "application/x-blender": [".blend"],
    },
  });

  useEffect(() => {
    const handle_drag_enter = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handle_drag_leave = (e) => {
      e.preventDefault();
      //   setIsDragging(false);

      if (e.relatedTarget === null) {
        setIsDragging(false);
      }
    };

    const handle_drag_over = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handle_drop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

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
    <>
      {isDragging && <Overlay />}
      <Inputbox getInputProps={getInputProps} getRootProps={getRootProps} />
    </>
  );
}

const Overlay = () => {
  return createPortal(
    <>
      <div className="file-drag-drop-overlay">
        <div className="dragdrop-border">
          <div className="dragdrop-infocontext">
            <img src={CloudBlenderLogo} alt="logo-svg" />
            <p>Drag and drop your blend file here</p>
          </div>
        </div>
      </div>
    </>,
    document.getElementById("dragdrop")
  );
};

const Inputbox = ({ getInputProps, getRootProps }) => {
  return (
    <>
      <div {...getRootProps({ className: "dropzone" })} className="cp-inputbox">
        <input {...getInputProps()} />
      </div>
    </>
  );
};
