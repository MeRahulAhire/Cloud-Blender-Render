import * as echarts from "echarts";

export const network_chart = (socket) => {
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
        text: "Network I/O",
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

export const cpu_chart = (socket) => {
  const container = document.getElementById("cpu-chart");
  if (!container) return;

  const existing = echarts.getInstanceByDom(container);
  if (existing) existing.dispose();
  const chart = echarts.init(container);

  const cpuData = [];
  const timeCpu = [];

  const updateChart = () => {
    chart.setOption({
      title: {
        text: "CPU Utilisation",
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
              return (
                `<span style="display:inline-block;margin-right:5px;border-radius:1px;width:16px;height:2px;background-color:RGBA(123, 104, 238, 1);"></span>` +
                `${item.seriesName}: ${item.value}%`
              );
            })
            .join("<br/>");
        },
      },
      legend: {
        data: [
          {
            name: "CPU",
            icon: "rect",
            itemStyle: { color: "RGBA(123, 104, 238, 1)" },
          },
        ],
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

  updateChart();

  socket.on("cpu_stats", ({ cpu_usage }) => {
    const now = new Date().toLocaleTimeString();
    timeCpu.push(now);
    cpuData.push(cpu_usage);
    if (timeCpu.length > 60) timeCpu.shift();
    if (cpuData.length > 60) cpuData.shift();
    updateChart();
  });

  window.addEventListener("resize", chart.resize);

  return () => {
    socket.disconnect();
    chart.dispose();
    window.removeEventListener("resize", chart.resize);
  };
};


export const ram_chart = (socket) => {
    // get container
    const container = document.getElementById("ram-chart");
    if (!container) return;
  
    // dispose existing chart if any
    const existing = echarts.getInstanceByDom(container);
    if (existing) existing.dispose();
    const chart = echarts.init(container);
  
    // data arrays
    const ramTotalData = [];
    const ramUsedData = [];
    const timeRam = [];
  
    // define series colors for tooltip & legend
    const seriesColors = [
      "RGBA(29, 233, 182, 1)",  // total RAM
      "RGBA(255, 60, 0, 1)"     // used RAM
    ];
  
    const updateChart = () => {
      chart.setOption({
        title: {
          text: "RAM Usage",
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
                const color = seriesColors[item.seriesIndex];
                return (
                  `<span style="
                    display:inline-block;
                    margin-right:5px;
                    border-radius:1px;
                    width:16px;
                    height:2px;
                    background-color:${color};
                  "></span>` +
                  `${item.seriesName}: ${item.value} GB`
                );
              })
              .join("<br/>");
          },
        },
        legend: {
          data: [
            { name: "Total", icon: "rect", itemStyle: { color: seriesColors[0] } },
            { name: "Used",  icon: "rect", itemStyle: { color: seriesColors[1] } },
          ],
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
          data: timeRam,
        },
        yAxis: {
          type: "value",
          min: 0,
          name: "GB",
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
            name: "Total",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: ramTotalData,
            lineStyle: { color: seriesColors[0], width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: seriesColors[0].replace(/1\)$/, "0.6)") },
                { offset: 1, color: seriesColors[0].replace(/1\)$/, "0)") }
              ]),
            },
          },
          {
            name: "Used",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: ramUsedData,
            lineStyle: { color: seriesColors[1], width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: seriesColors[1].replace(/1\)$/, "0.6)") },
                { offset: 1, color: seriesColors[1].replace(/1\)$/, "0)") }
              ]),
            },
          },
        ],
      });
    };
  
    // initial render
    updateChart();
  
    // listen for RAM stats events
    socket.on("ram_stats", ({ total_gb, used_gb }) => {
      const now = new Date().toLocaleTimeString();
      timeRam.push(now);
      ramTotalData.push(total_gb);
      ramUsedData.push(used_gb);
  
      // keep only last 60 points
      if (timeRam.length > 60) {
        timeRam.shift();
        ramTotalData.shift();
        ramUsedData.shift();
      }
  
      updateChart();
    });
  
    // handle resize
    window.addEventListener("resize", chart.resize);
  
    // cleanup
    return () => {
      socket.disconnect();
      chart.dispose();
      window.removeEventListener("resize", chart.resize);
    };
  };


export const gpu_util_chart = (socket) => {
  // get container
  const container = document.getElementById("gpu-util-chart");
  if (!container) return;

  // dispose existing chart if any
  const existing = echarts.getInstanceByDom(container);
  if (existing) existing.dispose();
  const chart = echarts.init(container);

  // timeline and per-GPU data storage
  const timeGpu = [];
  const dataMap = {}; // { gpuName: [val1, val2, ...], ... }

  // pre-defined GPU colors (50 entries)
  const gpu_color = [
    'rgba(126, 211, 33, 1)',   'rgba(245, 217, 20, 1)',
    'rgba(255, 149, 0, 1)',    'rgba(255, 59, 48, 1)',
    'rgba(0, 122, 255, 1)',    'rgba(175, 82, 222, 1)',
    'rgba(76, 217, 100, 1)',   'rgba(255, 204, 2, 1)',
    'rgba(255, 107, 53, 1)',   'rgba(88, 86, 214, 1)',
    'rgba(255, 45, 146, 1)',   'rgba(0, 212, 255, 1)',
    'rgba(50, 215, 75, 1)',    'rgba(255, 159, 10, 1)',
    'rgba(142, 142, 147, 1)',  'rgba(255, 99, 71, 1)',
    'rgba(34, 139, 34, 1)',    'rgba(30, 144, 255, 1)',
    'rgba(220, 20, 60, 1)',    'rgba(153, 50, 204, 1)',
    'rgba(82, 196, 26, 1)',    'rgba(250, 219, 20, 1)',
    'rgba(19, 194, 194, 1)',   'rgba(250, 140, 22, 1)',
    'rgba(245, 34, 45, 1)',    'rgba(47, 84, 235, 1)',
    'rgba(235, 47, 150, 1)',   'rgba(114, 46, 209, 1)',
    'rgba(56, 158, 13, 1)',    'rgba(212, 136, 6, 1)',
    'rgba(9, 109, 217, 1)',    'rgba(173, 78, 0, 1)',
    'rgba(168, 7, 26, 1)',     'rgba(9, 88, 217, 1)',
    'rgba(159, 18, 57, 1)',    'rgba(83, 29, 171, 1)',
    'rgba(115, 209, 61, 1)',   'rgba(255, 197, 61, 1)',
    'rgba(64, 169, 255, 1)',   'rgba(179, 127, 235, 1)',
    'rgba(255, 120, 117, 1)',  'rgba(54, 207, 201, 1)',
    'rgba(149, 222, 100, 1)',  'rgba(255, 214, 102, 1)',
    'rgba(211, 173, 247, 1)',  'rgba(135, 232, 222, 1)',
    'rgba(255, 163, 158, 1)',  'rgba(186, 230, 55, 1)',
    'rgba(145, 213, 255, 1)',  'rgba(255, 187, 150, 1)'
  ];

  // helper to build series config
  const buildSeries = () => {
    const gpuNames = Object.keys(dataMap);
    const tooMany = gpuNames.length > gpu_color.length;
    return gpuNames.map((name, idx) => {
      const baseColor = tooMany
        ? 'rgba(255,255,255,1)'
        : gpu_color[idx];
      // gradient for area
      const gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: baseColor.replace(/1\)$/, '0.6)') },
        { offset: 1, color: baseColor.replace(/1\)$/, '0)') }
      ]);

      return {
        name,
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: dataMap[name],
        lineStyle: { color: baseColor, width: 2 },
        areaStyle: { color: gradient }
      };
    });
  };

  const updateChart = () => {
    chart.setOption({
      title: {
        text: "GPU Utilisation",
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
              const idx = item.seriesIndex;
              const tooMany = params.length > gpu_color.length;
              const color = tooMany
                ? 'rgba(255,255,255,1)'
                : gpu_color[idx];
              return (
                `<span style="
                  display:inline-block;
                  margin-right:5px;
                  border-radius:1px;
                  width:16px;
                  height:2px;
                  background-color:${color};
                "></span>` +
                `${item.seriesName}: ${item.value}%`
              );
            })
            .join("<br/>");
        },
      },
      legend: {
        data: Object.keys(dataMap).map((name, idx) => ({
          name,
          icon: 'rect',
          itemStyle: {
            color: idx < gpu_color.length
              ? gpu_color[idx]
              : 'rgba(255,255,255,1)'
          }
        })),
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
        data: timeGpu,
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
      series: buildSeries(),
    });
  };

  // initial render (empty)
  updateChart();

  // handle incoming GPU util stats
  socket.on("gpu_util_stats", (payload) => {
    const now = new Date().toLocaleTimeString();
    timeGpu.push(now);
    if (timeGpu.length > 60) timeGpu.shift();

    // update each GPU's data array
    Object.entries(payload).forEach(([name, value]) => {
      if (!dataMap[name]) {
        dataMap[name] = [];
      }
      dataMap[name].push(value);
      if (dataMap[name].length > 60) {
        dataMap[name].shift();
      }
    });

    // re-render chart
    updateChart();
  });

  // handle resize
  window.addEventListener("resize", chart.resize);

  // cleanup
  return () => {
    socket.disconnect();
    chart.dispose();
    window.removeEventListener("resize", chart.resize);
  };
};


export const gpu_mem_chart = (socket) => {
    // get container
    const container = document.getElementById("gpu-mem-chart");
    if (!container) return;
  
    // dispose existing chart if any
    const existing = echarts.getInstanceByDom(container);
    if (existing) existing.dispose();
    const chart = echarts.init(container);
  
    // timeline and per-GPU data storage
    const timeGpuMem = [];
    const memMap = {}; // { gpuName: [val1, val2, ...], ... }
  
    // same 50-entry GPU color palette
    const gpu_color = [
      'rgba(126, 211, 33, 1)',   'rgba(245, 217, 20, 1)',
      'rgba(255, 149, 0, 1)',    'rgba(255, 59, 48, 1)',
      'rgba(0, 122, 255, 1)',    'rgba(175, 82, 222, 1)',
      'rgba(76, 217, 100, 1)',   'rgba(255, 204, 2, 1)',
      'rgba(255, 107, 53, 1)',   'rgba(88, 86, 214, 1)',
      'rgba(255, 45, 146, 1)',   'rgba(0, 212, 255, 1)',
      'rgba(50, 215, 75, 1)',    'rgba(255, 159, 10, 1)',
      'rgba(142, 142, 147, 1)',  'rgba(255, 99, 71, 1)',
      'rgba(34, 139, 34, 1)',    'rgba(30, 144, 255, 1)',
      'rgba(220, 20, 60, 1)',    'rgba(153, 50, 204, 1)',
      'rgba(82, 196, 26, 1)',    'rgba(250, 219, 20, 1)',
      'rgba(19, 194, 194, 1)',   'rgba(250, 140, 22, 1)',
      'rgba(245, 34, 45, 1)',    'rgba(47, 84, 235, 1)',
      'rgba(235, 47, 150, 1)',   'rgba(114, 46, 209, 1)',
      'rgba(56, 158, 13, 1)',    'rgba(212, 136, 6, 1)',
      'rgba(9, 109, 217, 1)',    'rgba(173, 78, 0, 1)',
      'rgba(168, 7, 26, 1)',     'rgba(9, 88, 217, 1)',
      'rgba(159, 18, 57, 1)',    'rgba(83, 29, 171, 1)',
      'rgba(115, 209, 61, 1)',   'rgba(255, 197, 61, 1)',
      'rgba(64, 169, 255, 1)',   'rgba(179, 127, 235, 1)',
      'rgba(255, 120, 117, 1)',  'rgba(54, 207, 201, 1)',
      'rgba(149, 222, 100, 1)',  'rgba(255, 214, 102, 1)',
      'rgba(211, 173, 247, 1)',  'rgba(135, 232, 222, 1)',
      'rgba(255, 163, 158, 1)',  'rgba(186, 230, 55, 1)',
      'rgba(145, 213, 255, 1)',  'rgba(255, 187, 150, 1)'
    ];
  
    // build series based on current memMap keys
    const buildSeries = () => {
      const names = Object.keys(memMap);
      const tooMany = names.length > gpu_color.length;
      return names.map((name, idx) => {
        const baseColor = tooMany
          ? 'rgba(255,255,255,1)'
          : gpu_color[idx];
        const gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: baseColor.replace(/1\)$/, '0.6)') },
          { offset: 1, color: baseColor.replace(/1\)$/, '0)') }
        ]);
        return {
          name,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: memMap[name],
          lineStyle: { color: baseColor, width: 2 },
          areaStyle: { color: gradient }
        };
      });
    };
  
    const updateChart = () => {
      chart.setOption({
        title: {
          text: "GPU Memory (GB)",
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
              .map((item) => {
                const idx = item.seriesIndex;
                const tooMany = params.length > gpu_color.length;
                const color = tooMany
                  ? 'rgba(255,255,255,1)'
                  : gpu_color[idx];
                return (
                  `<span style="
                    display:inline-block;
                    margin-right:5px;
                    border-radius:1px;
                    width:16px;
                    height:2px;
                    background-color:${color};
                  "></span>` +
                  `${item.seriesName}: ${item.value} GB`
                );
              })
              .join("<br/>")
        },
        legend: {
          data: Object.keys(memMap).map((name, idx) => ({
            name,
            icon: 'rect',
            itemStyle: {
              color: idx < gpu_color.length
                ? gpu_color[idx]
                : 'rgba(255,255,255,1)'
            }
          })),
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
          data: timeGpuMem,
        },
        yAxis: {
          type: "value",
          name: "GB",
          nameGap: 30,
          nameLocation: "middle",
          nameTextStyle: { color: "#888" },
          axisLine: { lineStyle: { color: "#888" } },
          splitLine: { lineStyle: { color: "#333" } },
        },
        animation: true,
        animationEasing: "cubicOut",
        series: buildSeries(),
      });
    };
  
    // initial empty render
    updateChart();
  
    socket.on("gpu_mem_stats", (payload) => {
      const now = new Date().toLocaleTimeString();
      timeGpuMem.push(now);
      if (timeGpuMem.length > 60) timeGpuMem.shift();
  
      Object.entries(payload).forEach(([name, usedGb]) => {
        if (!memMap[name]) memMap[name] = [];
        memMap[name].push(usedGb);
        if (memMap[name].length > 60) memMap[name].shift();
      });
  
      updateChart();
    });
  
    window.addEventListener("resize", chart.resize);
  
    return () => {
      socket.disconnect();
      chart.dispose();
      window.removeEventListener("resize", chart.resize);
    };
  };