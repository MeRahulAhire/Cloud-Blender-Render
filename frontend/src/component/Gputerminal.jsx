import React, { useEffect, useRef, useState } from "react";
import "../style/gputerminal.css";
import { initSocket } from "./Socket";
import * as echarts from "echarts";

export default function Gputerminal() {
  const socket = initSocket();

  useEffect(() => {
    const network_chart = () => {
      const container = document.getElementById("network-chart");
      if (!container) return;

      const existing = echarts.getInstanceByDom(container);
      if (existing) existing.dispose();

      const chart = echarts.init(container);
      const downloadData = [];
      const uploadData = [];
      const timeData = [];

      const updateChart = () => {
        chart.setOption({
          title: {
            text: "Network IO",
            left: "center",
            top: 10,
            textStyle: { color: "#e0e0e0", fontSize: 16 },
          },
          backgroundColor: "#212121",
          tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(50,50,50,0.25)",
            textStyle: { color: "#fff" },
            formatter: (params) => {
              return params
                .map((item) => {
                  const color =
                    item.seriesName === "Download" ? "#FF6FF5" : "#FFD700";
                  return (
                    `<span style="display:inline-block;margin-right:5px;border-radius:1px;width:16px;height:2px;background-color:${color};"></span>` +
                    `${item.seriesName}: ${item.value} Mbit/s`
                  );
                })
                .join("<br/>");
            },
          },
          legend: {
            data: [
              {
                name: "Download",
                icon: "rect",
                itemStyle: { color: "#FF6FF5" },
              },
              { name: "Upload", icon: "rect", itemStyle: { color: "#FFD700" } },
            ],
            itemWidth: 24,
            itemHeight: 3,
            bottom: 0,
            textStyle: { color: "#bbb", fontSize: 12 },
            selectedMode: false,
          },
          grid: {
            top: 60,
            bottom: 30,
            left: 40,
            right: 20,
            containLabel: true,
          },
          xAxis: {
            type: "category",
            boundaryGap: false,
            show: false,
            data: timeData,
          },
          yAxis: {
            type: "value",
            name: "Mbit/s",
            nameGap: 30,
            nameLocation: "middle",
            nameTextStyle: { color: "#888" },
            axisLine: { lineStyle: { color: "#888" } },
            splitLine: { lineStyle: { color: "#333" } },
          },
          animation: true,
          animationEasing: "cubicOut",
          series: [
            {
              name: "Download",
              type: "line",
              smooth: true,
              showSymbol: false,
              data: downloadData,
              lineStyle: { color: "#FF6FF5", width: 2 },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(255,111,245,0.6)" },
                  { offset: 1, color: "rgba(255,111,245,0)" },
                ]),
              },
            },
            {
              name: "Upload",
              type: "line",
              smooth: true,
              showSymbol: false,
              data: uploadData,
              lineStyle: { color: "#FFD700", width: 2 },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(255,215,0,0.6)" },
                  { offset: 1, color: "rgba(255,215,0,0)" },
                ]),
              },
            },
          ],
        });
      };

      // const socket = initSocket();
      socket.on("network_stats", (data) => {
        const now = new Date().toLocaleTimeString();
        timeData.push(now);
        downloadData.push(data.download_speed);
        uploadData.push(data.upload_speed);
        if (timeData.length > 60) timeData.shift();
        if (downloadData.length > 60) downloadData.shift();
        if (uploadData.length > 60) uploadData.shift();
        updateChart();
      });

      updateChart();
      window.addEventListener("resize", chart.resize);

      return () => {
        socket.disconnect();
        chart.dispose();
        window.removeEventListener("resize", chart.resize);
      };
    };

    network_chart();
  }, []);

  useEffect(() => {
    // const socket = initSocket();
    const container = document.getElementById("cpu-chart");
    if (!container) return;

  //   const containerRect = container.getBoundingClientRect();
  // container.style.width = containerRect.width + 'px';
  // container.style.height = containerRect.height + 'px';
    const existing = echarts.getInstanceByDom(container);
    if (existing) existing.dispose();
    const chart = echarts.init(container);

    const cpuData = [];
    const timeCpu = [];

    const update = () => {
      chart.setOption({
        title: {
          text: "CPU Utilization",
          left: "center",
          top: 10,
          textStyle: { color: "#e0e0e0", fontSize: 16 },
        },
        backgroundColor: "#212121",
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(50,50,50,0.25)",
          textStyle: { color: "#fff" },
          formatter: (params) =>
            params
              .map(
                (item) => `${item.marker} ${item.seriesName}: ${item.value}%`
              )
              .join("<br/>"),
        },
        legend: {
          data: [{ name: "CPU", icon: "rect", itemStyle: { color: "RGBA(123, 104, 238, 1)" } }],
          icon: "rect",
          itemWidth: 24,
          itemHeight: 3,
          bottom: 0,
          textStyle: { color: "#bbb", fontSize: 12 },
          selectedMode: false,
        },
        grid: { top: 60, bottom: 30, left: 40, right: 20, containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          show: false,
          data: timeCpu,
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 100,
          name: "Utilisation %",
          nameGap: 30,
          nameLocation: "middle",
          nameTextStyle: { color: "#888" },
          axisLine: { lineStyle: { color: "#888" } },
          splitLine: { lineStyle: { color: "#333" } },
        },
        animation: true,
        animationEasing: "cubicOut",
        series: [
          {
            name: "CPU",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: cpuData,
            lineStyle: { color: "rgba(123,104,238,1)", width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(123,104,238,0.6)" },
                { offset: 1, color: "rgba(123,104,238,0)" },
              ]),
            },
          },
        ],
      });
    };

    socket.on("cpu_stats", ({ cpu_usage }) => {
      const now = new Date().toLocaleTimeString();
      timeCpu.push(now);
      cpuData.push(cpu_usage);
      if (timeCpu.length > 60) timeCpu.shift();
      if (cpuData.length > 60) cpuData.shift();
      update();
    });

    update();
    window.addEventListener("resize", chart.resize);

    return () => {
      socket.disconnect();
      chart.dispose();
      window.removeEventListener("resize", chart.resize);
    };
    
  }, []);

  // Initialize xterm once

  return (
    <>
      <div className="gpu-terminal-container">
        <div className="cpu-section">
          <div id="cpu-chart" className="cpu-chart"></div>
        </div>
        <div className="ram-section"></div>
        <div className="gpu-util-section"></div>
        <div className="gpu-mem-section"></div>
        <div className="network-section">
          <div id="network-chart" className="network-chart"></div>
        </div>
      </div>
    </>
  );
}
