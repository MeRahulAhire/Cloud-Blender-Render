use netdev::get_default_interface;
use nvml_wrapper::Nvml;
use regex::Regex;
use serde_json::{Map, Value, json};
use socketioxide::extract::SocketRef;
use std::{thread, time::Duration};
use sysinfo::{Networks, System};

pub fn cpu_stats(socket: SocketRef) {
    thread::spawn(move || {
        let sock = socket;

        let mut system = System::new();

        loop {
            system.refresh_cpu_all();

            // get global CPU usage
            let cpu_usage: i32 = system.global_cpu_usage() as i32; // value between 0.0 and 100.0

            let usage_rounded = (cpu_usage * 100) / 100;

            let data = json!({
                "cpu_usage": usage_rounded
            });

            // println!("⚙️ CPU Usage: {:.2}%", usage_rounded); Debug flag

            if let Err(err) = sock.emit("cpu_stats", &data) {
                eprintln!("CPU stats error - {}", err);
                break;
            }

            thread::sleep(Duration::from_secs(1));
        }
    });
}

pub fn ram_stats(socket: SocketRef) {
    thread::spawn(move || {
        let sock = socket;

        let mut system = System::new();

        loop {
            system.refresh_memory();

            let total_bytes = system.total_memory(); // from KB to Bytes
            let used_bytes = system.total_memory() - system.available_memory();

            let total_gb = (total_bytes as f64 / 1_073_741_824.0 * 100.0).round() / 100.0; // 1 GB = 2^30 bytes
            let used_gb = (used_bytes as f64 / 1_073_741_824.0 * 100.0).round() / 100.0;

            let data = json!({
                "total_gb": total_gb,
                "used_gb": used_gb
            });

            // println!("🧠 RAM: {:.2} GB used / {:.2} GB total", used_gb, total_gb);

            if let Err(err) = sock.emit("ram_stats", &data) {
                eprintln!("RAM stats error - {}", err);
                break;
            }

            thread::sleep(Duration::from_secs(1));
        }
    });
}

pub fn gpu_util_stats(socket: SocketRef) {
    thread::spawn(move || {
        let sock = socket;

        // Initialize NVML
        let nvml = match Nvml::init() {
            Ok(n) => n,
            Err(err) => {
                eprintln!("Failed to initialize NVML: {}", err);
                return;
            }
        };

        // Regex to capture display name without prefixes and trailing details
        let re = Regex::new(r"(?xi)
            ^(?:NVIDIA|Tesla)\s+            # drop leading 'NVIDIA ' or 'Tesla '
            (?:GeForce\s+)?                # optionally drop 'GeForce '
            (?P<model>
                RTX\s+(?:2000|4000|5000|6000)\s+Ada       # RTX 2000/4000/5000/6000 Ada
              | RTX\s+\d{3,4}(?:\s+SUPER)?(?:\s+Ti)?     # RTX 3070, RTX 3080 Ti, RTX 4080 SUPER
              | RTX\s+A\d{4}                              # RTX A2000 / A4000 / …
              | GTX\s+(?:9\d{2}|10\d{2}|16\d{2})(?:\s+Ti)? # GTX 960 / GTX 1080 / GTX 1660 Ti
              | Titan(?:\s+(?:X(?:p)?|V|RTX))?              # Titan X / Titan Xp / Titan V / Titan RTX
              | A\d{2}(?:00)?                               # A30 / A40 / A100
              | B200                                       # B200
              | H100(?:\s+(?:SXM|NVL|PCIe))?                # H100 SXM / NVL / PCIe
              | H200\s+SXM                                 # H200 SXM
              | L4|L40S?                                   # L4 / L40 / L40S
              | V100(?:-FHHL|-PCIE|-SXM2)?                  # V100 FHHL / PCIE / SXM2
            )
            (?:\b|$)                # stop at word boundary or end
        ").unwrap();

        loop {
            let count = match nvml.device_count() {
                Ok(c) => c,
                Err(err) => {
                    eprintln!("NVML device_count error: {}", err);
                    thread::sleep(Duration::from_secs(1));
                    continue;
                }
            };

            let mut stats_map: Map<String, Value> = Map::with_capacity(count as usize);
            for idx in 0..count {
                if let Ok(device) = nvml.device_by_index(idx) {
                    if let Ok(util) = device.utilization_rates() {
                        if let Ok(raw_name) = device.name() {
                            let display = if let Some(caps) = re.captures(&raw_name) {
                                caps.name("model").unwrap().as_str().to_string()
                            } else {
                                raw_name
                                    .trim_start_matches("NVIDIA ")
                                    .trim_start_matches("Tesla ")
                                    .trim_start_matches("GeForce ")
                                    .to_string()
                            };
                            
                            // Create unique key by appending index, but only if multiple GPUs exist
                            let key = if count > 1 {
                                format!("{}_{}", display, idx)
                            } else {
                                display
                            };
                            
                            stats_map.insert(key, json!(util.gpu));
                        }
                    }
                }
            }

            let data = Value::Object(stats_map);
            // println!("🖥️ GPU Stats: {}", &data);
            if let Err(err) = sock.emit("gpu_util_stats", &data) {
                eprintln!("GPU stats emit error: {}", err);
                break;
            }

            thread::sleep(Duration::from_secs(1));
        }
    });
}

pub fn gpu_mem_stats(socket: SocketRef) {
    thread::spawn(move || {
        let sock = socket;

        // Initialize NVML
        let nvml = match Nvml::init() {
            Ok(n) => n,
            Err(err) => {
                eprintln!("Failed to initialize NVML: {}", err);
                return;
            }
        };

        // Same regex for display names
        let re = Regex::new(
            r"(?xi)
            ^(?:NVIDIA|Tesla)\s+            # drop leading 'NVIDIA ' or 'Tesla '
            (?:GeForce\s+)?                # optionally drop 'GeForce '
            (?P<model>
                RTX\s+(?:2000|4000|5000|6000)\s+Ada
              | RTX\s+\d{3,4}(?:\s+SUPER)?(?:\s+Ti)?
              | RTX\s+A\d{4}
              | GTX\s+(?:9\d{2}|10\d{2}|16\d{2})(?:\s+Ti)?
              | Titan(?:\s+(?:X(?:p)?|V|RTX))?
              | A\d{2}(?:00)?
              | B200
              | H100(?:\s+(?:SXM|NVL|PCIe))?
              | H200\s+SXM
              | L4|L40S?
              | V100(?:-FHHL|-PCIE|-SXM2)?
            )
            (?:\b|$)
        ",
        )
        .unwrap();

        loop {
            let count = match nvml.device_count() {
                Ok(c) => c,
                Err(err) => {
                    eprintln!("NVML device_count error: {}", err);
                    thread::sleep(Duration::from_secs(1));
                    continue;
                }
            };

            let mut mem_map: Map<String, Value> = Map::with_capacity(count as usize);
            for idx in 0..count {
                if let Ok(device) = nvml.device_by_index(idx) {
                    if let Ok(mem_info) = device.memory_info() {
                        if let Ok(raw_name) = device.name() {
                            // extract display name
                            let display = if let Some(caps) = re.captures(&raw_name) {
                                caps.name("model").unwrap().as_str().to_string()
                            } else {
                                raw_name
                                    .trim_start_matches("NVIDIA ")
                                    .trim_start_matches("Tesla ")
                                    .trim_start_matches("GeForce ")
                                    .to_string()
                            };
                            
                            // Create unique key by appending index, but only if multiple GPUs exist
                            let key = if count > 1 {
                                format!("{}_{}", display, idx)
                            } else {
                                display
                            };
                            
                            // used memory in bytes -> GB
                            let used_gb =
                                (mem_info.used as f64 / 1_073_741_824.0 * 100.0).round() / 100.0;
                            mem_map.insert(key, json!(used_gb));
                        }
                    }
                }
            }

            let data = Value::Object(mem_map);
            // println!("🖥️ GPU Mem Stats (GB): {}", data);
            if let Err(err) = sock.emit("gpu_mem_stats", &data) {
                eprintln!("GPU mem stats emit error: {}", err);
                break;
            }

            thread::sleep(Duration::from_secs(1));
        }
    });
}

pub fn network_stats(socket: SocketRef) {
    thread::spawn(move || {
        let sock = socket;

        let default_interface = match get_default_interface() {
            Ok(iface) => iface.name,
            Err(err) => {
                eprintln!(
                    "Could not find default network adapter. Error message - {}",
                    err
                );
                return;
            }
        };
        let mut network = Networks::new();
        network.refresh(true);

        loop {
            network.refresh(true);

            let initial_value = match network.get(&default_interface) {
                Some(data) => (data.total_received(), data.total_transmitted()),
                None => {
                    eprintln!("Interface {} not found", &default_interface);
                    thread::sleep(Duration::from_secs(1));
                    continue;
                }
            };

            thread::sleep(Duration::from_secs(1));
            network.refresh(true);

            if let Some(data) = network.get(&default_interface) {
                let rx_data = data.total_received().saturating_sub(initial_value.0);
                let tx_data = data.total_transmitted().saturating_sub(initial_value.1);

                let rx_mbit = (rx_data * 8) / 1_000_000;
                let tx_mbit = (tx_data * 8) / 1_000_000;

                let data = json!({
                    "download_speed" : rx_mbit,
                    "upload_speed" : tx_mbit
                });

                // println!("↓ {:.3} Mbit/s ↑ {:.3} Mbit/s", rx_mbit, tx_mbit); Debug

                if let Err(err) = sock.emit("network_stats", &data) {
                    eprintln!("Network stats error - {}", err);
                    break;
                }
            }
        }
    });
}
