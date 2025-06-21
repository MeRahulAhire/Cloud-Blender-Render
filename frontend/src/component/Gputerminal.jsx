import { useEffect} from "react";
import "../style/gputerminal.css";
import { initSocket } from "./Socket";
import {cpu_chart,ram_chart,gpu_util_chart,gpu_mem_chart, network_chart} from "./Chartdata"

export default function Gputerminal() {
  const socket = initSocket();

  useEffect(() => {
    
    cpu_chart(socket);
    ram_chart(socket);
    gpu_util_chart(socket);
    gpu_mem_chart(socket);
    network_chart(socket);

  }, []);

  return (
    <>
      <div className="gpu-terminal-container">
        <div className="terminal-top-section">
          <div className="cpu-section">
            <div id="cpu-chart" className="cpu-chart">
            </div>
          </div>
          <div className="ram-section">
            <div id="ram-chart" className="ram-chart"></div>
          </div>
        </div>
        <div className="terminal-mid-section">
          <div className="gpu-util-section">
            <div id="gpu-util-chart" className="gpu-util-chart">
              
            </div>
          </div>
          <div className="gpu-mem-section">
            <div id="gpu-mem-chart" className="gpu-mem-chart">

            </div>
          </div>
        </div>
        <div className="network-section">
          <div id="network-chart" className="network-chart"></div>
        </div>
      </div>
    </>
  );
}
