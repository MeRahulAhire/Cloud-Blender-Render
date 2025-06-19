use netdev::get_default_interface;
use serde_json::json;
use socketioxide::extract::SocketRef;
use std::{thread::{self, sleep}, time::Duration};
use sysinfo::Networks;

pub fn live_network_stats(socket: SocketRef) {
    // thread::spawn(move || {
    //     let sock = socket;

    //     let default_interface = match get_default_interface() {
    //         Ok(iface) => iface.name,
    //         Err(err) => {
    //             eprintln!(
    //                 "Could not find default network adapter. Error message - {}",
    //                 err
    //             );
    //             return;
    //         }
    //     };
    //     let mut network = Networks::new();
    //     network.refresh(true);

    //     loop {
    //         network.refresh(true);

    //         let initial_value = match network.get(&default_interface) {
    //             Some(data) => (data.total_received(), data.total_transmitted()),
    //             None => {
    //                 eprintln!("Interface {} not found", &default_interface);
    //                 thread::sleep(Duration::from_secs(1));
    //                 continue;
    //             }
    //         };

    //         thread::sleep(Duration::from_secs(1));
    //         network.refresh(true);

    //         if let Some(data) = network.get(&default_interface) {
    //             let rx_data = data.total_received().saturating_sub(initial_value.0);
    //             let tx_data = data.total_transmitted().saturating_sub(initial_value.1);

    //             let rx_mbit = ((rx_data * 8) as f64 / 1_000_000.0 * 1_000.0).round() / 1_000.0;
    //             let tx_mbit = ((tx_data * 8) as f64 / 1_000_000.0 * 1_000.0).round() / 1_000.0;

    //             let data = json!({
    //                 "download_speed" : rx_mbit,
    //                 "upload_speed" : tx_mbit
    //             });

    //             println!(
    //                 "↓ {:.3} Mbit/s ↑ {:.3} Mbit/s",
    //                 rx_mbit,
    //                 tx_mbit
    //             );
    //             if let Err(err) = sock.emit("network_stats", &data) {
    //                 eprintln!("Network stats error - {}", err);
    //             }
    //         }
    //     }
    // });

    let default_iface = get_default_interface()
    .expect("Could not determine default network interface");

let iface_name = default_iface.name;
println!("Monitoring default interface: {}\n", iface_name);

let mut networks = Networks::new_with_refreshed_list();

loop {
    networks.refresh(true);

    // Get initial cumulative byte count
    let initial = match networks.get(&iface_name) {
        Some(data) => (data.total_received(), data.total_transmitted()),
        None => {
            eprintln!("Interface {} not found in sysinfo", iface_name);
            sleep(Duration::from_secs(1));
            continue;
        }
    };

    sleep(Duration::from_secs(1));
    networks.refresh(true);

    // Get updated byte count
    if let Some(updated) = networks.get(&iface_name) {
        let rx_delta = updated.total_received() - initial.0;
        let tx_delta = updated.total_transmitted() - initial.1;

        let rx_mbit = (rx_delta * 8) as f64 / 1_000_000.0;
        let tx_mbit = (tx_delta * 8) as f64 / 1_000_000.0;

        println!("{iface_name}: ↓ {:.3} Mbit/s ↑ {:.3} Mbit/s", rx_mbit, tx_mbit);
    } else {
        eprintln!("Interface {} disappeared!", iface_name);
    }

    println!();
}

}