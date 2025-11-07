// import "../style/extensionupload.css";
// import zip from "../assets/icons/zip.svg";
// export default function ExtensionUpload() {
//   return (
//     <>
//       <div className="extension-box">
//         <div className="extension-drag-drop">
//           Upload your Blender extension here
//         </div>
//       </div>
//       <AddonUpload />
//     </>
//   );
// }

// const AddonUpload = () => {
//   return (
//     <>
//       <div className="addon-upload-container">
//         <div className="addon-icon">
//           <img src={zip} alt="zip-icon" />
//         </div>
//         <div className="addon-file-name"> sample name symphony.zip</div>
//         <div className="addon-upload-percentage">100%</div>
//       </div>
//     </>
//   );
// };

import "../style/extensionupload.css";
import zip from "../assets/icons/zip.svg";
import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import pLimit from "p-limit";
import central_store from "./Store";

export default function ExtensionUpload() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const base_url = central_store((state) => state.base_url);

  const handleFiles = useCallback((selectedFiles) => {
    const fileArray = Array.from(selectedFiles).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${file.name}`,
      name: file.name,
      progress: 0,
      status: "pending", // pending, uploading, completed, error
    }));
    setFiles((prev) => [...prev, ...fileArray]);
  }, []);

  const uploadFile = async (fileObj, index) => {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(fileObj.file.size / CHUNK_SIZE);
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f))
      );

      // Upload first chunk to establish session
      const firstChunk = fileObj.file.slice(0, Math.min(CHUNK_SIZE, fileObj.file.size));
      const firstFormData = new FormData();
      firstFormData.append("file", firstChunk);
      firstFormData.append("chunk_index", "0");
      firstFormData.append("total_chunks", totalChunks.toString());
      firstFormData.append("file_name", fileObj.file.name);
      firstFormData.append("file_id", fileId);

      await axios.post(`${base_url}/upload_extension_file`, firstFormData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      let uploadedChunks = 1;
      const percentage = Math.round((1 * 100) / totalChunks);
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, progress: percentage } : f))
      );

      // If only one chunk, we're done
      if (totalChunks === 1) {
        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, status: "completed", progress: 100 } : f))
        );
        return true;
      }

      // Upload remaining chunks in parallel
      const limit = pLimit(10);
      const remainingPromises = Array.from({ length: totalChunks - 1 }, (_, i) => {
        const chunkIndex = i + 1;
        return limit(async () => {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileObj.file.size);
          const chunk = fileObj.file.slice(start, end);

          const formData = new FormData();
          formData.append("file", chunk);
          formData.append("chunk_index", chunkIndex.toString());
          formData.append("total_chunks", totalChunks.toString());
          formData.append("file_name", fileObj.file.name);
          formData.append("file_id", fileId);

          const response = await axios.post(`${base_url}/upload_extension_file`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          });

          uploadedChunks++;
          const newPercentage = Math.round((uploadedChunks * 100) / totalChunks);
          setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, progress: newPercentage } : f))
          );

          return response;
        });
      });

      await Promise.all(remainingPromises);

      // Mark as completed
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: "completed", progress: 100 } : f))
      );

      return true;
    } catch (error) {
      console.error(`❌ Upload failed for ${fileObj.name}:`, error);
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: "error" } : f))
      );
      return false;
    }
  };

  const processQueue = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Process files one by one
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "pending") {
        const success = await uploadFile(files[i], i);
        
        if (success) {
          // Remove the completed file after a brief delay
          await new Promise(resolve => setTimeout(resolve, 500));
          setFiles((prev) => prev.filter((_, idx) => idx !== i));
          // Adjust index since we removed an item
          i--;
        }
      }
    }

    setIsProcessing(false);
  }, [files, isProcessing, base_url]);

  // Start processing when new files are added
  useEffect(() => {
    const hasPending = files.some((f) => f.status === "pending");
    const hasUploading = files.some((f) => f.status === "uploading");
    
    if (hasPending && !hasUploading && !isProcessing) {
      processQueue();
    }
  }, [files, processQueue, isProcessing]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ""; // Reset input to allow selecting same files again
    }
  };

  return (
    <>
      <div className="extension-box">
        <div
          className={`extension-drag-drop ${isDragging ? "dragging" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          {isDragging
            ? "Drop your files here"
            : "Click or drag and drop your Blender extensions here"}
        </div>
      </div>

      {files.map((fileObj, index) => (
        <AddonUpload
          key={fileObj.id}
          name={fileObj.name}
          progress={fileObj.progress}
          status={fileObj.status}
        />
      ))}
    </>
  );
}

const AddonUpload = ({ name, progress, status }) => {
  return (
    <div className="addon-upload-container">
      <div className="addon-icon">
        <img src={zip} alt="zip-icon" />
      </div>
      <div className="addon-file-name">{name}</div>
      <div className="addon-upload-percentage">
        {status === "error" ? "Error" : `${progress}%`}
      </div>
    </div>
  );
};