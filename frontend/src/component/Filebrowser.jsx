import "../style/filebrowser.css";

export default function Filebrowser() {
    const items = Array.from({ length: 1000 });
  return (
    <div className="filebrowser-container">
      <div className="filelist-box">
        {/* <File_list /> */}
        {items.map((_, index) => (
        <File_list key={index} index={index + 1}/>
      ))}
      </div>
      <div className="download-files">
        Select folder and download all files
      </div>
    </div>
  );
}

const File_list = ({index}) => {
  return (
    <>
      <div className="file-list">
        <p>{String(index).padStart(4, '0')}.png</p>
      </div>
    </>
  );
};
