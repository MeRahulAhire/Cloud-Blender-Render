import "../style/filebrowser.css";
import Link from "../assets/icons/link.svg";
import Download from "../assets/icons/download.svg";
import central_store from "./Store";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import pLimit from "p-limit";

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

  //   const handleDownloadAll = useCallback(async () => {
  //   if (!!!render_status && rendered_image_list.length > 0) {
  //     try {

  //       if ("showDirectoryPicker" in window) {
  //         const dir_handle = await window.showDirectoryPicker();
  //         await dir_handle.requestPermission({ mode: 'readwrite' });

  //         const concurrency_limit = 10; // Adjust based on your server capacity (8-15 is optimal)
  //         let completed_files = 0;

  //         const limit = pLimit(concurrency_limit);

  //         // Process all files with controlled concurrency
  //         const download_and_write_promises = rendered_image_list.map(file_name =>
  //           limit(async () => {
  //             try {
  //               // Download file
  //               const response = await axios.get(`${base_url}/images/${file_name}`, {
  //                 withCredentials: true,
  //                 responseType: 'blob'
  //               });

  //               // Write file immediately
  //               const file_handle = await dir_handle.getFileHandle(file_name, {
  //                 create: true,
  //               });
  //               const writable = await file_handle.createWritable();
  //               await writable.write(response.data);
  //               await writable.close();

  //               // Update progress
  //               completed_files++;
  //               const percent = Math.round((completed_files / rendered_image_list.length) * 100);
  //               set_file_download_progress(percent);

  //               return { file_name, success: true };
  //             } catch (error) {
  //               console.error(`Failed to process ${file_name}:`, error);

  //               // Still update progress even on failure
  //               completed_files++;
  //               const percent = Math.round((completed_files / rendered_image_list.length) * 100);
  //               set_file_download_progress(percent);

  //               return { file_name, error, success: false };
  //             }
  //           })
  //         );

  //         // Wait for all downloads to complete
  //         const results = await Promise.allSettled(download_and_write_promises);

  //         // Optional: Log any failures
  //         const failures = results
  //           .filter(result => result.status === 'fulfilled' && !result.value.success)
  //           .map(result => result.value.file_name);

  //         if (failures.length > 0) {
  //           console.warn('Failed to download/write files:', failures);
  //         }
  //       }

  //       else {
  //         // Fallback for browsers without File System Access API
  //         for (let i = 0; i < rendered_image_list.length; i++) {
  //           const file_name = rendered_image_list[i];

  //           try {
  //             const response = await axios.get(`${base_url}/images/${file_name}`, {
  //               withCredentials: true,
  //               responseType: 'blob'
  //             });
  //             const blob = response.data;
  //             const url = URL.createObjectURL(blob);

  //             const a = document.createElement("a");
  //             a.href = url;
  //             a.download = file_name;
  //             document.body.appendChild(a);
  //             a.click();
  //             document.body.removeChild(a);
  //             URL.revokeObjectURL(url);

  //             const percent = Math.round(((i + 1) / rendered_image_list.length) * 100);
  //             set_file_download_progress(percent);
  //           } catch (error) {
  //             console.error(`Failed to download ${file_name}:`, error);
  //             // Continue with next file instead of breaking the entire process
  //           }
  //         }
  //       }
  //     } catch (err) {
  //       console.error(err);
  //       alert("Download failed: " + err.message);
  //     }
  //   }
  // }, [base_url, rendered_image_list, blend_file_present, render_status]);

  const handleDownloadAll = useCallback(async () => {
    if (!!!render_status && rendered_image_list.length > 0) {
      try {
        if ("showDirectoryPicker" in window) {
          const dir_handle = await window.showDirectoryPicker();
          await dir_handle.requestPermission({ mode: "readwrite" });

          const concurrency_limit = 1;
          let completed_files = 0;

          const limit = pLimit(concurrency_limit);

          // Process all files with controlled concurrency
          const download_and_write_promises = rendered_image_list.map(
            (file_name) =>
              limit(async () => {
                try {
                  // Download file
                  const response = await axios.get(
                    `${base_url}/images/${file_name}`,
                    {
                      withCredentials: true,
                      responseType: "blob",
                    }
                  );

                  // Write file immediately
                  const file_handle = await dir_handle.getFileHandle(
                    file_name,
                    {
                      create: true,
                    }
                  );
                  const writable = await file_handle.createWritable();
                  await writable.write(response.data);
                  await writable.close();

                  // Update progress
                  completed_files++;
                  const percent = Math.round(
                    (completed_files / rendered_image_list.length) * 100
                  );
                  set_file_download_progress(percent);

                  return { file_name, success: true };
                } catch (error) {
                  console.error(`Failed to process ${file_name}:`, error);

                  // Still update progress even on failure
                  completed_files++;
                  const percent = Math.round(
                    (completed_files / rendered_image_list.length) * 100
                  );
                  set_file_download_progress(percent);

                  return { file_name, error, success: false };
                }
              })
          );

          // Wait for all downloads to complete
          await Promise.allSettled(download_and_write_promises);

          // Verify downloaded files by traversing directory
          const downloaded_files = new Set();

          for await (const entry of dir_handle.values()) {
            if (entry.kind === "file") {
              downloaded_files.add(entry.name);
            }
          }

          // Find missing files
          const missing_files = rendered_image_list.filter(
            (file_name) => !downloaded_files.has(file_name)
          );

          if (missing_files.length > 0) {
            console.warn("Missing files detected:", missing_files);

            // Retry downloading missing files
            const retry_failures = [];

            for (const file_name of missing_files) {
              set_file_download_progress(`Retrying downloading ${file_name}`);

              try {
                const response = await axios.get(
                  `${base_url}/images/${file_name}`,
                  {
                    withCredentials: true,
                    responseType: "blob",
                  }
                );

                const file_handle = await dir_handle.getFileHandle(file_name, {
                  create: true,
                });
                const writable = await file_handle.createWritable();
                await writable.write(response.data);
                await writable.close();

                console.log(`Successfully retried ${file_name}`);
              } catch (error) {
                console.error(`Retry failed for ${file_name}:`, error);
                retry_failures.push(file_name);
              }
            }

            // Reset progress after retry
            set_file_download_progress(0);

            // Alert user if there are still failures after retry
            if (retry_failures.length > 0) {
              alert(
                `Failed to download the following files. Please download them manually:\n\n${retry_failures.join(
                  ", "
                )}`
              );
            }
          } else {
            // All files downloaded successfully
            set_file_download_progress(0);
          }
        } else {
          // Fallback for browsers without File System Access API
          for (let i = 0; i < rendered_image_list.length; i++) {
            const file_name = rendered_image_list[i];

            try {
              const response = await axios.get(
                `${base_url}/images/${file_name}`,
                {
                  withCredentials: true,
                  responseType: "blob",
                }
              );
              const blob = response.data;
              const url = URL.createObjectURL(blob);

              const a = document.createElement("a");
              a.href = url;
              a.download = file_name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);

              const percent = Math.round(
                ((i + 1) / rendered_image_list.length) * 100
              );
              set_file_download_progress(percent);
            } catch (error) {
              console.error(`Failed to download ${file_name}:`, error);
              // Continue with next file instead of breaking the entire process
            }
          }

          // Reset progress for fallback method
          set_file_download_progress(0);
        }
      } catch (err) {
        console.error(err);
        alert("Download failed: " + err.message);
        set_file_download_progress(0);
      }
    }
  }, [
    base_url,
    rendered_image_list,
    render_status,
    set_file_download_progress,
  ]);

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
        {file_download_progress !== 0 &&
        file_download_progress !== 100 &&
        file_download_progress !== "" ? (
          typeof file_download_progress === "string" ? (
            file_download_progress
          ) : (
            `${file_download_progress}%`
          )
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
