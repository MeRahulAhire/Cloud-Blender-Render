// import React, { useEffect, useRef, useState } from 'react';
// import "../style/gputerminal.css"
// import { initSocket } from "./Socket"
// import { Terminal } from 'xterm';
// import 'xterm/css/xterm.css';

// export default function Gputerminal() {

//     const socket = initSocket();
//     const terminalRef = useRef(null);
//   const termRef = useRef(null);
//   const [gpuData, setGpuData] = useState('');

//   // Initialize xterm once
//   useEffect(() => {
//     if (terminalRef.current && !termRef.current) {
//       const term = new Terminal({
//         cursorBlink: false,
//         disableStdin: true,
//         allowTransparency: true
//       });
//       term.open(terminalRef.current);
//       termRef.current = term;
//     }
//   }, []);

//   // Listen for GPU stats from server
//   useEffect(() => {
//     socket.on('gpu_stats', (data) => {
        
//       setGpuData(data.line + '\r\n');
//     });
//     socket.on('gpu_stats_error', (err) => {
//       console.error('GPU Stats Error:', err);
//     });

//     return () => {
//       socket.off('gpu_stats');
//       socket.off('gpu_stats_error');
//     };
//   }, []);

//   // Write to terminal whenever gpuData updates
//   useEffect(() => {
//     if (termRef.current && gpuData) {
//       termRef.current.write(gpuData);
//     }
//   }, [gpuData]);
//   return (
//     <>
//     <div className="gpu-terminal-container">
//         <div className="terminal-section" ref={terminalRef} >

//         </div>
//     </div>
//     </>
//   )
// }

import React from 'react'
import { initSocket } from './Socket'
import { Terminal } from 'xterm'
import 'xterm/css/xterm.css'
import '../style/gputerminal.css'

export default function Gputerminal() {
  const socket = initSocket()
  let terminal  // holds our Terminal instance

  // callback ref: called once the div is mounted
  const attachTerminal = (el) => {
    if (!el || terminal) return  // only init once

    // 1) Create & open the terminal
    terminal = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      allowTransparency: true,
    })
    terminal.open(el)

    terminal.onResize(({ cols, rows }) => {
      console.table({
        "col" : cols,
        "row" : rows
      })
    });

    // 2) Wire up socket listeners
    socket.on('gpu_stats', ({ chunk, line }) => {
      // depending on whether you're emitting `chunk` (raw bytes) or `line`
      terminal.write(chunk ?? (line + '\r\n'))
    })
    socket.on('gpu_stats_error', (err) => {
      console.error('GPU Stats Error:', err)
      terminal.writeln('\r\n❗ GPU Stats Error')
    })
  }

  return (
    <div className="gpu-terminal-container">
      <div
        className="terminal-section"
        ref={attachTerminal}
      />
    </div>
  )
}
