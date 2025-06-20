import React, { useEffect, useRef, useState } from "react";
import "../style/gputerminal.css";
import { initSocket } from "./Socket";

export default function Gputerminal() {
  const socket = initSocket();
 
  useEffect(() => {
    // socket.on("network_stats", (res) => {
    //   console.table({
    //     "Download speed" : res.download_speed,
    //     "Upload Speed" : res.upload_speed
    //   })
    // })
  },[])

  // Initialize xterm once
  
  return (
    <>
      <div className="gpu-terminal-container">
        <div className="cpu-section"></div>
        <div className="ram-section"></div>
        <div className="gpu-util-section"></div>
        <div className="gpu-mem-section"></div>
        <div className="network-section"></div>
        .
      </div>
    </>
  );
}
