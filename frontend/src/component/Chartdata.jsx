import * as echarts from "echarts";

export const cpu_chart = (socket) => {
  const container = document.getElementById("cpu-chart");
  if (!container) return;

  const existing = echarts.getInstanceByDom(container);
  if (existing) existing.dispose();
  const chart = echarts.init(container);

  const cpu_data = [];
  const time_cpu = [];

  const update_chart = () => {
    if (chart.isDisposed()) return;
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
        data: time_cpu,
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
          data: cpu_data,
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

  update_chart();

  socket.on("cpu_stats", ({ cpu_usage }) => {
    const now = new Date().toLocaleTimeString();
    time_cpu.push(now);
    cpu_data.push(cpu_usage);
    if (time_cpu.length > 60) time_cpu.shift();
    if (cpu_data.length > 60) cpu_data.shift();
    update_chart();
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
  const ram_total_data = [];
  const ram_used_data = [];
  const time_ram = [];

  // define series colors for tooltip & legend
  const series_colors = [
    "RGBA(29, 233, 182, 1)", // total RAM
    "RGBA(255, 60, 0, 1)", // used RAM
  ];

  const update_chart = () => {
    if (chart.isDisposed()) return;
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
              const color = series_colors[item.seriesIndex];
              return (
                `<span style="
                    display:inline-block;
                    margin-right:5px;
                    border-radius:1px;
                    width:16px;
                    height:2px;
                    background-color:${color};
                  "></span>` + `${item.seriesName}: ${item.value} GB`
              );
            })
            .join("<br/>");
        },
      },
      legend: {
        data: [
          {
            name: "Total",
            icon: "rect",
            itemStyle: { color: series_colors[0] },
          },
          {
            name: "Used",
            icon: "rect",
            itemStyle: { color: series_colors[1] },
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
        data: time_ram,
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
          data: ram_total_data,
          lineStyle: { color: series_colors[0], width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: series_colors[0].replace(/1\)$/, "0.6)") },
              { offset: 1, color: series_colors[0].replace(/1\)$/, "0)") },
            ]),
          },
        },
        {
          name: "Used",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: ram_used_data,
          lineStyle: { color: series_colors[1], width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: series_colors[1].replace(/1\)$/, "0.6)") },
              { offset: 1, color: series_colors[1].replace(/1\)$/, "0)") },
            ]),
          },
        },
      ],
    });
  };

  // initial render
  update_chart();

  // listen for RAM stats events
  socket.on("ram_stats", ({ total_gb, used_gb }) => {
    const now = new Date().toLocaleTimeString();
    time_ram.push(now);
    ram_total_data.push(total_gb);
    ram_used_data.push(used_gb);

    // keep only last 60 points
    if (time_ram.length > 60) {
      time_ram.shift();
      ram_total_data.shift();
      ram_used_data.shift();
    }

    update_chart();
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
  const time_gpu = [];
  const data_map = {}; // { gpuName: [val1, val2, ...], ... }

  // pre-defined GPU colors (50 entries)
  const gpu_color = [
    "rgba(126, 211, 33, 1)",
    "rgba(245, 217, 20, 1)",
    "rgba(255, 149, 0, 1)",
    "rgba(255, 59, 48, 1)",
    "rgba(0, 122, 255, 1)",
    "rgba(175, 82, 222, 1)",
    "rgba(76, 217, 100, 1)",
    "rgba(255, 204, 2, 1)",
    "rgba(255, 107, 53, 1)",
    "rgba(88, 86, 214, 1)",
    "rgba(255, 45, 146, 1)",
    "rgba(0, 212, 255, 1)",
    "rgba(50, 215, 75, 1)",
    "rgba(255, 159, 10, 1)",
    "rgba(142, 142, 147, 1)",
    "rgba(255, 99, 71, 1)",
    "rgba(34, 139, 34, 1)",
    "rgba(30, 144, 255, 1)",
    "rgba(220, 20, 60, 1)",
    "rgba(153, 50, 204, 1)",
    "rgba(82, 196, 26, 1)",
    "rgba(250, 219, 20, 1)",
    "rgba(19, 194, 194, 1)",
    "rgba(250, 140, 22, 1)",
    "rgba(245, 34, 45, 1)",
    "rgba(47, 84, 235, 1)",
    "rgba(235, 47, 150, 1)",
    "rgba(114, 46, 209, 1)",
    "rgba(56, 158, 13, 1)",
    "rgba(212, 136, 6, 1)",
    "rgba(9, 109, 217, 1)",
    "rgba(173, 78, 0, 1)",
    "rgba(168, 7, 26, 1)",
    "rgba(9, 88, 217, 1)",
    "rgba(159, 18, 57, 1)",
    "rgba(83, 29, 171, 1)",
    "rgba(115, 209, 61, 1)",
    "rgba(255, 197, 61, 1)",
    "rgba(64, 169, 255, 1)",
    "rgba(179, 127, 235, 1)",
    "rgba(255, 120, 117, 1)",
    "rgba(54, 207, 201, 1)",
    "rgba(149, 222, 100, 1)",
    "rgba(255, 214, 102, 1)",
    "rgba(211, 173, 247, 1)",
    "rgba(135, 232, 222, 1)",
    "rgba(255, 163, 158, 1)",
    "rgba(186, 230, 55, 1)",
    "rgba(145, 213, 255, 1)",
    "rgba(255, 187, 150, 1)",
  ];

  // helper to build series config
  const build_series = () => {
    const gpu_names = Object.keys(data_map);
    const too_many = gpu_names.length > gpu_color.length;
    return gpu_names.map((name, idx) => {
      const base_color = too_many ? "rgba(255,255,255,1)" : gpu_color[idx];
      // gradient for area
      const gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: base_color.replace(/1\)$/, "0.6)") },
        { offset: 1, color: base_color.replace(/1\)$/, "0)") },
      ]);

      return {
        name,
        type: "line",
        smooth: true,
        showSymbol: false,
        data: data_map[name],
        lineStyle: { color: base_color, width: 2 },
        areaStyle: { color: gradient },
      };
    });
  };

  const update_chart = () => {
    if (chart.isDisposed()) return;
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
              const too_many = params.length > gpu_color.length;
              const color = too_many ? "rgba(255,255,255,1)" : gpu_color[idx];
              return (
                `<span style="
                    display:inline-block;
                    margin-right:5px;
                    border-radius:1px;
                    width:16px;
                    height:2px;
                    background-color:${color};
                  "></span>` + `${item.seriesName}: ${item.value}%`
              );
            })
            .join("<br/>");
        },
      },
      legend: {
        data: Object.keys(data_map).map((name, idx) => ({
          name,
          icon: "rect",
          itemStyle: {
            color:
              idx < gpu_color.length ? gpu_color[idx] : "rgba(255,255,255,1)",
          },
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
        data: time_gpu,
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
      series: build_series(),
    });
  };

  // initial render (empty)
  update_chart();

  // handle incoming GPU util stats
  socket.on("gpu_util_stats", (payload) => {
    const now = new Date().toLocaleTimeString();
    // console.log(payload)
    time_gpu.push(now);
    if (time_gpu.length > 60) time_gpu.shift();

    // update each GPU's data array
    Object.entries(payload).forEach(([name, value]) => {
      if (!data_map[name]) {
        data_map[name] = [];
      }
      data_map[name].push(value);
      if (data_map[name].length > 60) {
        data_map[name].shift();
      }
    });

    // re-render chart
    update_chart();
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
  const time_gpu_mem = [];
  const mem_map = {}; // { gpuName: [val1, val2, ...], ... }

  // same 50-entry GPU color palette
  const gpu_color = [
    "rgba(126, 211, 33, 1)",
    "rgba(245, 217, 20, 1)",
    "rgba(255, 149, 0, 1)",
    "rgba(255, 59, 48, 1)",
    "rgba(0, 122, 255, 1)",
    "rgba(175, 82, 222, 1)",
    "rgba(76, 217, 100, 1)",
    "rgba(255, 204, 2, 1)",
    "rgba(255, 107, 53, 1)",
    "rgba(88, 86, 214, 1)",
    "rgba(255, 45, 146, 1)",
    "rgba(0, 212, 255, 1)",
    "rgba(50, 215, 75, 1)",
    "rgba(255, 159, 10, 1)",
    "rgba(142, 142, 147, 1)",
    "rgba(255, 99, 71, 1)",
    "rgba(34, 139, 34, 1)",
    "rgba(30, 144, 255, 1)",
    "rgba(220, 20, 60, 1)",
    "rgba(153, 50, 204, 1)",
    "rgba(82, 196, 26, 1)",
    "rgba(250, 219, 20, 1)",
    "rgba(19, 194, 194, 1)",
    "rgba(250, 140, 22, 1)",
    "rgba(245, 34, 45, 1)",
    "rgba(47, 84, 235, 1)",
    "rgba(235, 47, 150, 1)",
    "rgba(114, 46, 209, 1)",
    "rgba(56, 158, 13, 1)",
    "rgba(212, 136, 6, 1)",
    "rgba(9, 109, 217, 1)",
    "rgba(173, 78, 0, 1)",
    "rgba(168, 7, 26, 1)",
    "rgba(9, 88, 217, 1)",
    "rgba(159, 18, 57, 1)",
    "rgba(83, 29, 171, 1)",
    "rgba(115, 209, 61, 1)",
    "rgba(255, 197, 61, 1)",
    "rgba(64, 169, 255, 1)",
    "rgba(179, 127, 235, 1)",
    "rgba(255, 120, 117, 1)",
    "rgba(54, 207, 201, 1)",
    "rgba(149, 222, 100, 1)",
    "rgba(255, 214, 102, 1)",
    "rgba(211, 173, 247, 1)",
    "rgba(135, 232, 222, 1)",
    "rgba(255, 163, 158, 1)",
    "rgba(186, 230, 55, 1)",
    "rgba(145, 213, 255, 1)",
    "rgba(255, 187, 150, 1)",
  ];

  // build series based on current mem_map keys
  const build_series = () => {
    const names = Object.keys(mem_map);
    const too_many = names.length > gpu_color.length;
    return names.map((name, idx) => {
      const base_color = too_many ? "rgba(255,255,255,1)" : gpu_color[idx];
      const gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: base_color.replace(/1\)$/, "0.6)") },
        { offset: 1, color: base_color.replace(/1\)$/, "0)") },
      ]);
      return {
        name,
        type: "line",
        smooth: true,
        showSymbol: false,
        data: mem_map[name],
        lineStyle: { color: base_color, width: 2 },
        areaStyle: { color: gradient },
      };
    });
  };

  const update_chart = () => {
    if (chart.isDisposed()) return;
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
              const too_many = params.length > gpu_color.length;
              const color = too_many ? "rgba(255,255,255,1)" : gpu_color[idx];
              return (
                `<span style="
                    display:inline-block;
                    margin-right:5px;
                    border-radius:1px;
                    width:16px;
                    height:2px;
                    background-color:${color};
                  "></span>` + `${item.seriesName}: ${item.value} GB`
              );
            })
            .join("<br/>"),
      },
      legend: {
        data: Object.keys(mem_map).map((name, idx) => ({
          name,
          icon: "rect",
          itemStyle: {
            color:
              idx < gpu_color.length ? gpu_color[idx] : "rgba(255,255,255,1)",
          },
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
        data: time_gpu_mem,
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
      series: build_series(),
    });
  };

  // initial empty render
  update_chart();

  socket.on("gpu_mem_stats", (payload) => {
    const now = new Date().toLocaleTimeString();
    time_gpu_mem.push(now);
    if (time_gpu_mem.length > 60) time_gpu_mem.shift();

    Object.entries(payload).forEach(([name, used_gb]) => {
      if (!mem_map[name]) mem_map[name] = [];
      mem_map[name].push(used_gb);
      if (mem_map[name].length > 60) mem_map[name].shift();
    });

    update_chart();
  });

  window.addEventListener("resize", chart.resize);

  return () => {
    socket.disconnect();
    chart.dispose();
    window.removeEventListener("resize", chart.resize);
  };
};

export const network_chart = (socket) => {
  const container = document.getElementById("network-chart");
  if (!container) return;

  const existing = echarts.getInstanceByDom(container);
  if (existing) existing.dispose();

  const chart = echarts.init(container);
  const download_data = [];
  const upload_data = [];
  const time_data = [];

  const update_chart = () => {
    if (chart.isDisposed()) return;
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
        data: time_data,
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
          data: download_data,
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
          data: upload_data,
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

  socket.on("network_stats", (data) => {
    const now = new Date().toLocaleTimeString();
    time_data.push(now);
    download_data.push(data.download_speed);
    upload_data.push(data.upload_speed);
    if (time_data.length > 60) time_data.shift();
    if (download_data.length > 60) download_data.shift();
    if (upload_data.length > 60) upload_data.shift();
    update_chart();
  });

  update_chart();
  window.addEventListener("resize", chart.resize);

  return () => {
    socket.disconnect();
    chart.dispose();
    window.removeEventListener("resize", chart.resize);
  };
};



// export const gpu_util_chart = (socket) => {
//   // get container
//   const container = document.getElementById("gpu-util-chart");
//   if (!container) return;

//   // dispose existing chart if any
//   const existing = echarts.getInstanceByDom(container);
//   if (existing) existing.dispose();
//   const chart = echarts.init(container);

//   // timeline and per-GPU data storage
//   const time_gpu = [];
//   const data_map = {}; // { displayName: [val1, val2, ...], ... }
//   const gpu_index_map = {}; // track original keys to display names
//   const gpu_series_map = {}; // track unique series for same-named GPUs
  
//   // pre-defined GPU colors (50 entries)
//   const gpu_color = [
//     "rgba(126, 211, 33, 1)",
//     "rgba(245, 217, 20, 1)",
//     "rgba(255, 149, 0, 1)",
//     "rgba(255, 59, 48, 1)",
//     "rgba(0, 122, 255, 1)",
//     "rgba(175, 82, 222, 1)",
//     "rgba(76, 217, 100, 1)",
//     "rgba(255, 204, 2, 1)",
//     "rgba(255, 107, 53, 1)",
//     "rgba(88, 86, 214, 1)",
//     "rgba(255, 45, 146, 1)",
//     "rgba(0, 212, 255, 1)",
//     "rgba(50, 215, 75, 1)",
//     "rgba(255, 159, 10, 1)",
//     "rgba(142, 142, 147, 1)",
//     "rgba(255, 99, 71, 1)",
//     "rgba(34, 139, 34, 1)",
//     "rgba(30, 144, 255, 1)",
//     "rgba(220, 20, 60, 1)",
//     "rgba(153, 50, 204, 1)",
//     "rgba(82, 196, 26, 1)",
//     "rgba(250, 219, 20, 1)",
//     "rgba(19, 194, 194, 1)",
//     "rgba(250, 140, 22, 1)",
//     "rgba(245, 34, 45, 1)",
//     "rgba(47, 84, 235, 1)",
//     "rgba(235, 47, 150, 1)",
//     "rgba(114, 46, 209, 1)",
//     "rgba(56, 158, 13, 1)",
//     "rgba(212, 136, 6, 1)",
//     "rgba(9, 109, 217, 1)",
//     "rgba(173, 78, 0, 1)",
//     "rgba(168, 7, 26, 1)",
//     "rgba(9, 88, 217, 1)",
//     "rgba(159, 18, 57, 1)",
//     "rgba(83, 29, 171, 1)",
//     "rgba(115, 209, 61, 1)",
//     "rgba(255, 197, 61, 1)",
//     "rgba(64, 169, 255, 1)",
//     "rgba(179, 127, 235, 1)",
//     "rgba(255, 120, 117, 1)",
//     "rgba(54, 207, 201, 1)",
//     "rgba(149, 222, 100, 1)",
//     "rgba(255, 214, 102, 1)",
//     "rgba(211, 173, 247, 1)",
//     "rgba(135, 232, 222, 1)",
//     "rgba(255, 163, 158, 1)",
//     "rgba(186, 230, 55, 1)",
//     "rgba(145, 213, 255, 1)",
//     "rgba(255, 187, 150, 1)",
//   ];

//   // helper to create display name from GPU key
//   const create_display_name = (gpu_key) => {
//     // Simply extract base name (remove _n suffix)
//     return gpu_key.replace(/_\d+$/, '');
//   };

//   // helper to build series config
//   const build_series = () => {
//     const series_keys = Object.keys(gpu_series_map);
//     const too_many = series_keys.length > gpu_color.length;
    
//     return series_keys.map((series_key, idx) => {
//       const base_color = too_many ? "rgba(255,255,255,1)" : gpu_color[idx];
//       const display_name = gpu_series_map[series_key].display_name;
      
//       // Create unique series name for legend (but tooltip will show clean name)
//       const unique_series_name = `${display_name}_${series_key.split('_').pop()}`;
      
//       // gradient for area
//       const gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
//         { offset: 0, color: base_color.replace(/1\)$/, "0.6)") },
//         { offset: 1, color: base_color.replace(/1\)$/, "0)") },
//       ]);

//       return {
//         name: unique_series_name,
//         type: "line",
//         smooth: true,
//         showSymbol: false,
//         data: gpu_series_map[series_key].data,
//         lineStyle: { color: base_color, width: 2 },
//         areaStyle: { color: gradient },
//         // Store the clean display name for tooltip usage
//         displayName: display_name,
//       };
//     });
//   };

//   const update_chart = () => {
//     if (chart.isDisposed()) return;
//     chart.setOption({
//       title: {
//         text: "GPU Utilisation",
//         left: "center",
//         top: 10,
//         textStyle: { color: "#e0e0e0", fontSize: 16 },
//       },
//       backgroundColor: "#212121",
//       tooltip: {
//         trigger: "axis",
//         backgroundColor: "rgba(50,50,50,0.25)",
//         textStyle: { color: "#fff" },
//         formatter: (params) => {
//           return params
//             .map((item) => {
//               const idx = item.seriesIndex;
//               const too_many = params.length > gpu_color.length;
//               const color = too_many ? "rgba(255,255,255,1)" : gpu_color[idx];
//               // Use the clean display name from series data
//               const cleanName = item.seriesName.replace(/_\d+$/, '');
//               return (
//                 `<span style="
//                     display:inline-block;
//                     margin-right:5px;
//                     border-radius:1px;
//                     width:16px;
//                     height:2px;
//                     background-color:${color};
//                   "></span>` + `${cleanName}: ${item.value}%`
//               );
//             })
//             .join("<br/>");
//         },
//       },
//       legend: {
//         data: Object.keys(gpu_series_map).map((series_key, idx) => {
//           const display_name = gpu_series_map[series_key].display_name;
//           const unique_series_name = `${display_name}_${series_key.split('_').pop()}`;
//           return {
//             name: unique_series_name,
//             icon: "rect",
//             itemStyle: {
//               color: idx < gpu_color.length ? gpu_color[idx] : "rgba(255,255,255,1)",
//             },
//           };
//         }),
//         icon: "rect",
//         itemWidth: 24,
//         itemHeight: 3,
//         bottom: 0,
//         textStyle: { color: "#bbb", fontSize: 12 },
//         selectedMode: false,
//         // Custom formatter to show clean names in legend
//         formatter: function(name) {
//           // Remove the _n suffix from legend display
//           return name.replace(/_\d+$/, '');
//         },
//       },
//       grid: { top: 60, bottom: 30, left: 40, right: 20, containLabel: true },
//       xAxis: {
//         type: "category",
//         boundaryGap: false,
//         show: false,
//         data: time_gpu,
//       },
//       yAxis: {
//         type: "value",
//         min: 0,
//         max: 100,
//         name: "Utilisation %",
//         nameGap: 30,
//         nameLocation: "middle",
//         nameTextStyle: { color: "#888" },
//         axisLine: { lineStyle: { color: "#888" } },
//         splitLine: { lineStyle: { color: "#333" } },
//       },
//       animation: true,
//       animationEasing: "cubicOut",
//       series: build_series(),
//     });
//   };

//   // initial render (empty)
//   update_chart();

//   // handle incoming GPU util stats
//   socket.on("gpu_util_stats", (payload) => {
//     const now = new Date().toLocaleTimeString();
//     // console.log("Original payload:", payload);
    
//     time_gpu.push(now);
//     if (time_gpu.length > 60) time_gpu.shift();

//     // Get all GPU keys to determine display names
//     const gpu_keys = Object.keys(payload);
    
//     // Process each GPU and create appropriate display names
//     Object.entries(payload).forEach(([original_key, value]) => {
//       const display_name = create_display_name(original_key);
      
//       // Create unique series key (original key) but use display name for showing
//       if (!gpu_series_map[original_key]) {
//         gpu_series_map[original_key] = {
//           display_name: display_name,
//           data: []
//         };
//       }
      
//       // Update mapping
//       gpu_index_map[original_key] = display_name;
      
//       // Add new data point
//       gpu_series_map[original_key].data.push(value);
      
//       // Keep only last 60 data points
//       if (gpu_series_map[original_key].data.length > 60) {
//         gpu_series_map[original_key].data.shift();
//       }
//     });


//     // re-render chart
//     update_chart();
//   });

//   // handle resize
//   window.addEventListener("resize", chart.resize);

//   // cleanup
//   return () => {
//     socket.disconnect();
//     chart.dispose();
//     window.removeEventListener("resize", chart.resize);
//   };
// };