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
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import pLimit from "p-limit";
import central_store from "./Store";

export default function ExtensionUpload() {
  const [files, setFiles] = useState([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(-1);
  const base_url = central_store((state) => state.base_url);

  const uploadFile = async (fileObj) => {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(fileObj.file.size / CHUNK_SIZE);
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    try {
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
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, progress: percentage } : f
        )
      );

      // If only one chunk, we're done
      if (totalChunks === 1) {
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
            prev.map((f) =>
              f.id === fileObj.id ? { ...f, progress: newPercentage } : f
            )
          );

          return response;
        });
      });

      await Promise.all(remainingPromises);
      return true;
    } catch (error) {
      console.error(`❌ Upload failed for ${fileObj.name}:`, error);
      return false;
    }
  };

  const processQueue = useCallback(async () => {
    if (files.length === 0 || currentUploadIndex >= 0) {
      return;
    }

    for (let i = 0; i < files.length; i++) {
      setCurrentUploadIndex(i);
      
      const success = await uploadFile(files[i]);
      
      if (success) {
        // Wait a bit before removing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Remove the completed file
        setFiles((prev) => prev.filter((f) => f.id !== files[i].id));
      } else {
        // On error, mark it and move to next
        setFiles((prev) =>
          prev.map((f) =>
            f.id === files[i].id ? { ...f, status: "error" } : f
          )
        );
      }
    }
    
    setCurrentUploadIndex(-1);
  }, [files, currentUploadIndex, base_url]);

  useEffect(() => {
    if (files.length > 0 && currentUploadIndex === -1) {
      processQueue();
    }
  }, [files, currentUploadIndex, processQueue]);

  const onDrop = useCallback((acceptedFiles) => {
    const fileArray = acceptedFiles.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${file.name}`,
      name: file.name,
      progress: 0,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...fileArray]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: false,
  });

  return (
    <>
      <div className="extension-box">
        <div
          {...getRootProps()}
          className="extension-drag-drop"
          style={{
            border: isDragActive ? "2.5px solid #007AFF" : undefined,
            cursor: "pointer",
          }}
        >
          <input {...getInputProps()} />
          Click or drag and drop your Blender extensions here
        </div>
      </div>

      {files.map((fileObj) => (
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