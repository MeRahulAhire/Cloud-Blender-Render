import "../style/filebrowser.css";
import Link from "../assets/icons/link.svg";
import Download from "../assets/icons/download.svg";
import central_store from "./Store";
import { useCallback, useEffect, useState } from "react";

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

  const handleDownloadAll = useCallback(async () => {
    if (!!blend_file_present && !render_status) {
      try {
        if ("showDirectoryPicker" in window) {
          const dir_handle = await window.showDirectoryPicker();

          for (let i = 0; i < rendered_image_list.length; i++) {
            const file_name = rendered_image_list[i];
            const response = await fetch(`${base_url}/images/${file_name}`);
            const blob = await response.blob();

            const file_handle = await dir_handle.getFileHandle(file_name, {
              create: true,
            });
            const writable = await file_handle.createWritable();
            await writable.write(blob);
            await writable.close();

            const percent = Math.round(
              ((i + 1) / rendered_image_list.length) * 100
            );
            set_file_download_progress(percent);
          }
        } else {
          for (let i = 0; i < rendered_image_list.length; i++) {
            const file_name = rendered_image_list[i];
            const response = await fetch(`${base_url}/images/${file_name}`);
            const blob = await response.blob();
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
          }
        }
      } catch (err) {
        console.error(err);
        alert("Download failed:" + err.message);
      }
    }
  }, [base_url, rendered_image_list]);

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
