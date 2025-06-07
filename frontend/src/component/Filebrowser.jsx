import "../style/filebrowser.css";
import Link from "../assets/icons/link.svg"
import Download from "../assets/icons/download.svg"
export default function Filebrowser() {
    const items = Array.from({ length: 1000 });
  return (
    <div className="filebrowser-container">
      <div className="filelist-box">
        {items.map((_, index) => (
        <File_list key={index} index={index + 1}/>
      ))}
      </div>
      <div className="download-files">
      <img src={Download} alt="" />
      </div>
    </div>
  );
}

const File_list = ({index}) => {
  return (
    <>
      <div className="file-list">
        <p>{String(index).padStart(4, '0')}.png</p>
        <a href="https://google.com" target="_blank" rel="noopener noreferrer"  >
        <img src={Link} alt="link icon"  />
        </a>
      </div>
    </>
  );
};
