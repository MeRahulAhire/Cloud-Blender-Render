use netdev::get_default_interface;
use serde_json::{json, Value, Map};
use socketioxide::extract::SocketRef;
use std::{thread, time::Duration};
use sysinfo::{Networks, System};
use nvml_wrapper::Nvml;

pub fn live_network_stats(socket: SocketRef) {
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
                }
            }
        }
    });
}


pub fn live_cpu_stats(socket: SocketRef) {
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
            }

            thread::sleep(Duration::from_secs(1));
        }
    });
}

pub fn live_ram_stats(socket: SocketRef) {
    thread::spawn(move || {
        let sock = socket;

        let mut system = System::new();

        loop {
            system.refresh_memory();

            let total_bytes = system.total_memory(); // from KB to Bytes
            let used_bytes = system.total_memory() - system.available_memory();

            let total_gb = (total_bytes as f64 / 1_073_741_824.0 * 100.0) / 100.0; // 1 GB = 2^30 bytes
            let used_gb = (used_bytes as f64 / 1_073_741_824.0 * 100.0).round() / 100.0;

            let data = json!({
                "total_gb": total_gb,
                "used_gb": used_gb
            });

            // println!("🧠 RAM: {:.2} GB used / {:.2} GB total", used_gb, total_gb);

            if let Err(err) = sock.emit("ram_stats", &data) {
                eprintln!("RAM stats error - {}", err);
            }

            thread::sleep(Duration::from_secs(1));
        }
    });
}


pub fn live_gpu_stats(socket: SocketRef) {
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

        loop {
            // Query how many NVIDIA devices are present
            let count = match nvml.device_count() {
                Ok(c) => c,
                Err(err) => {
                    eprintln!("NVML device_count error: {}", err);
                    thread::sleep(Duration::from_secs(1));
                    continue;
                }
            };

            // Build a JSON map: { "GPU 0": 12.3, "GPU 1": 45.6, … }
            let mut stats_map = Map::with_capacity(count as usize);
            for idx in 0..count {
                if let Ok(device) = nvml.device_by_index(idx) {
                    if let Ok(util) = device.utilization_rates() {
                        let key = format!("GPU {}", idx);
                        // `util.gpu` is a u32 percent
                        stats_map.insert(key, json!(util.gpu));
                    }
                }
            }
            let data: Value = Value::Object(stats_map);

            // Log locally and emit to clients
            println!("🖥️ GPU Stats: {}", &data);
            if let Err(err) = sock.emit("gpu_stats", &data) {
                eprintln!("GPU stats emit error: {}", err);
            }

            thread::sleep(Duration::from_secs(1));
        }
    });
}