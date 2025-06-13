import "../style/filebrowser.css";
import Link from "../assets/icons/link.svg";
import Download from "../assets/icons/download.svg";
import central_store from "./Store";
import { useCallback } from "react";
export default function Filebrowser() {
  const rendered_image_list = central_store(
    (state) => state.rendered_image_list
  );
  const base_url = central_store((state) => state.base_url);

  const handleDownloadAll = useCallback(async () => {
    try {
      // Chromium-only path: write directly into a picked folder
      if ("showDirectoryPicker" in window) {
        const dirHandle = await window.showDirectoryPicker();

        for (const fileName of rendered_image_list) {
          const resp = await fetch(`${base_url}/images/${fileName}`);
          const blob = await resp.blob();

          const fileHandle = await dirHandle.getFileHandle(fileName, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }

        alert("All images saved to folder!");
      } else {
        // Fallback: trigger browser downloads one by one
        for (const fileName of rendered_image_list) {
          const resp = await fetch(`${base_url}/images/${fileName}`);
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Download failed: " + err.message);
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
      <div className="download-files" onClick={handleDownloadAll} >
        <img src={Download} alt="" />
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
