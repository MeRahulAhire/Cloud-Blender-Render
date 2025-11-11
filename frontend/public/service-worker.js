// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
    console.log('Push notification received', event)
    
    let notificationData = {
        type: 'render_complete'
    }

    // Parse the payload if it exists
    if (event.data) {
        try {
            notificationData = event.data.json()
        } catch (e) {
            console.error('Error parsing push data:', e)
        }
    }

    // Send message to all clients (for in-tab sound notification)
    event.waitUntil(
        self.clients.matchAll().then(function(clients) {
            clients.forEach(function(client) {
                client.postMessage({
                    type: notificationData.type
                })
            })
        })
    )

    // Show the notification
    const title = 'Cloud Blender Render'
    const options = {
        body: 'Rendering finished. Please check and download your files.',
        icon: '/cloud-blender-render-logo.svg',
        badge: '/cloud-blender-render-logo.svg',
        requireInteraction: false,
        data: {
            url: '/'
        }
    }

    event.waitUntil(
        self.registration.showNotification(title, options)
    )
})

// Handle notification click
self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked', event)
    
    event.notification.close()

    // Open or focus the app window
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // If a window is already open, focus it
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i]
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus()
                    }
                }
                // Otherwise, open a new window
                if (self.clients.openWindow) {
                    return self.clients.openWindow('/')
                }
            })
    )
})

// Service worker activation
self.addEventListener('activate', function(event) {
    console.log('Service worker activated')
    event.waitUntil(self.clients.claim())
})

// Service worker installation
self.addEventListener('install', function(event) {
    console.log('Service worker installed')
    self.skipWaiting()
})