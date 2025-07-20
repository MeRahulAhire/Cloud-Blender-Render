import "../style/filebrowser.css";
import Link from "../assets/icons/link.svg";
import Download from "../assets/icons/download.svg";
import central_store from "./Store";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

export default function Filebrowser() {
  const rendered_image_list = central_store(
    (state) => state.rendered_image_list
  );
  const base_url = central_store((state) => state.base_url);
  const blend_file_present = central_store(
    (state) => state.blend_file.is_present
  );
  const render_status = central_store(
    (state) => state.render_status.is_rendering
  );
  const set_rendered_image_list = central_store(
    (state) => state.set_rendered_image_list
  );

  const [file_download_progress, set_file_download_progress] = useState(0);

  useEffect(() => {
    set_rendered_image_list();
  }, []);

  // const handleDownloadAll = useCallback(async () => {
  //   if (!!blend_file_present && !render_status) {
  //     try {
  //       if ("showDirectoryPicker" in window) {
  //         const dir_handle = await window.showDirectoryPicker();

  //         for (let i = 0; i < rendered_image_list.length; i++) {
  //           const file_name = rendered_image_list[i];
  //           const response = await axios.get(`${base_url}/images/${file_name}`, {withCredentials: true, responseType: 'blob'});
  //           const blob = await response.data;

  //           const file_handle = await dir_handle.getFileHandle(file_name, {
  //             create: true,
  //           });
  //           const writable = await file_handle.createWritable();
  //           await writable.write(blob);
  //           await writable.close();

  //           const percent = Math.round(
  //             ((i + 1) / rendered_image_list.length) * 100
  //           );
  //           set_file_download_progress(percent);
  //         }
  //       } else {
  //         for (let i = 0; i < rendered_image_list.length; i++) {
  //           const file_name = rendered_image_list[i];
  //           const response = await axios.get(`${base_url}/images/${file_name}`, {withCredentials: true, responseType: 'blob'});
  //           const blob = await response.data;
  //           const url = URL.createObjectURL(blob);

  //           const a = document.createElement("a");
  //           a.href = url;
  //           a.download = file_name;
  //           document.body.appendChild(a);
  //           a.click();
  //           document.body.removeChild(a);
  //           URL.revokeObjectURL(url);

  //           const percent = Math.round(
  //             ((i + 1) / rendered_image_list.length) * 100
  //           );
  //           set_file_download_progress(percent);
  //         }
  //       }
  //     } catch (err) {
  //       console.error(err);
  //       alert("Download failed:" + err.message);
  //     }
  //   }
  // }, [base_url, rendered_image_list]);

  const handleDownloadAll = useCallback(async () => {
  if (!!!render_status && rendered_image_list.length > 0) {
    try {
      if ("showDirectoryPicker" in window) {
        const dir_handle = await window.showDirectoryPicker();
        const batchSize = 5; // Adjust based on your needs (5-10 is usually optimal)
        
        for (let i = 0; i < rendered_image_list.length; i += batchSize) {
          const batch = rendered_image_list.slice(i, i + batchSize);
          
          const downloadPromises = batch.map(async (file_name) => {
            try {
              const response = await axios.get(`${base_url}/images/${file_name}`, {
                withCredentials: true, 
                responseType: 'blob'
              });
              return { file_name, blob: response.data, success: true };
            } catch (error) {
              console.error(`Failed to download ${file_name}:`, error);
              return { file_name, error, success: false };
            }
          });

          const results = await Promise.allSettled(downloadPromises);
          
          // Process successful downloads immediately
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
              const { file_name, blob } = result.value;
              
              try {
                const file_handle = await dir_handle.getFileHandle(file_name, {
                  create: true,
                });
                const writable = await file_handle.createWritable();
                await writable.write(blob);
                await writable.close();
              } catch (writeError) {
                console.error(`Failed to write ${file_name}:`, writeError);
                // You might want to collect failed writes and show them to user
              }
            }
          }
          
          // Update progress after each batch
          const completedFiles = Math.min(i + batchSize, rendered_image_list.length);
          const percent = Math.round((completedFiles / rendered_image_list.length) * 100);
          set_file_download_progress(percent);
        }
      } else {
        // Fallback for browsers without File System Access API
        for (let i = 0; i < rendered_image_list.length; i++) {
          const file_name = rendered_image_list[i];
          
          try {
            const response = await axios.get(`${base_url}/images/${file_name}`, {
              withCredentials: true, 
              responseType: 'blob'
            });
            const blob = response.data;
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = file_name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const percent = Math.round(((i + 1) / rendered_image_list.length) * 100);
            set_file_download_progress(percent);
          } catch (error) {
            console.error(`Failed to download ${file_name}:`, error);
            // Continue with next file instead of breaking the entire process
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("Download failed: " + err.message);
    }
  }
}, [base_url, rendered_image_list, blend_file_present, render_status]);

  return (
    <div className="filebrowser-container">
      <div className="filelist-box">
        {rendered_image_list.map((file_name) => (
          <File_list
            base_url={base_url}
            file_name={file_name}
            key={file_name}
          />
        ))}
      </div>
      <div
        className={`download-files ${!!render_status ? `dim-opacity` : ``}`}
        onClick={handleDownloadAll}
      >
        {file_download_progress > 0 && file_download_progress < 100 ? (
          `${file_download_progress}%`
        ) : (
          <img src={Download} alt="" />
        )}
      </div>
    </div>
  );
}

const File_list = ({ base_url, file_name }) => {
  return (
    <>
      <div className="file-list">
        <p>{file_name}</p>
        <a
          href={`${base_url}/images/${file_name}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={Link} alt="link icon" />
        </a>
      </div>
    </>
  );
};
