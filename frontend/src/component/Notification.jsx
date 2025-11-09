// import "../style/notification.css"
// import notification from "../assets/icons/notification.svg"
// import active_notification from "../assets/icons/notification_active.svg"
// import notification_sound from "../assets/audio/notification.mp3"
// import logo from "../assets/icons/cloud-blender-render-logo.svg"
// import central_store from "./Store";
// import axios from "axios"
// export default function Notification() {
//     const base_url = central_store((state) => state.base_url);
//   return (
//     <>
//     {/* <Subscribe/> */}
//     {/* <Unsubscribe/> */}
//     <Notification_button_info/>
//     </>
//   )
// }

// const Subscribe = () => {
//     return (
//         <>
//         <button className="notification-subscribe">
//             Enable notification <img src={notification} alt="" />
//         </button>
        
//         </>
//     )
// }
// const Unsubscribe = () => {
//     return (
//         <>
//         <button className="notification-unsubscribe">
//             Notification enabled <img src={active_notification} alt="" />
//         </button>
        
//         </>
//     )
// }


// const Notification_button_info = () => {
//     return (
//         <>
//         <p className="notification-button-info">
//             By turning on the notification, you'll be notified when the rendering is over.
//         </p>
//         </>
//     )
// }

import { useState, useEffect } from "react"
import "../style/notification.css"
import notification from "../assets/icons/notification.svg"
import active_notification from "../assets/icons/notification_active.svg"
import notification_sound from "../assets/audio/notification.mp3"
import logo from "../assets/icons/cloud-blender-render-logo.svg"
import central_store from "./Store"
import axios from "axios"

const VAPID_PUBLIC_KEY = "BGdqGpTMThGXR1oAau7FddChScYzNwObQZfPNudix3uoSiwurNbx-8WdmLbhMekyalvnXZaV0tzA2kyWYNuoSbA"

export default function Notification() {
    const base_url = central_store((state) => state.base_url)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        checkSubscriptionStatus()
        
        // Listen for notification events when tab is open
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'render_complete') {
                    playNotificationSound()
                }
            })
        }
    }, [])

    const checkSubscriptionStatus = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.log('Push notifications not supported')
                setIsChecking(false)
                return
            }

            // Wait for any existing service worker
            const registration = await navigator.serviceWorker.getRegistration()
            if (registration) {
                const subscription = await registration.pushManager.getSubscription()
                setIsSubscribed(!!subscription)
            }
            
            setIsChecking(false)
        } catch (error) {
            console.error('Error checking subscription:', error)
            setIsChecking(false)
        }
    }

    const playNotificationSound = () => {
        const audio = new Audio(notification_sound)
        audio.play().catch(err => console.error('Error playing sound:', err))
    }

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/')

        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    const subscribeToNotifications = async () => {
        try {
            setIsLoading(true)

            // Request notification permission
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                alert('Notification permission denied')
                setIsLoading(false)
                return
            }

            // Register service worker if not already registered
            let registration
            if ('serviceWorker' in navigator) {
                registration = await navigator.serviceWorker.register('/service-worker.js')
                await navigator.serviceWorker.ready
            } else {
                alert('Service workers not supported')
                setIsLoading(false)
                return
            }

            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })

            // Send subscription to backend
            const origin = window.location.origin
            const response = await axios.post(`${base_url}/activate_push_notification`, {
                subscription: subscription.toJSON(),
                origin: origin
            })

            if (response.data.success) {
                setIsSubscribed(true)
                console.log('✅ Push notification activated')
            }
        } catch (error) {
            console.error('Error subscribing to notifications:', error)
            alert('Failed to enable notifications. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const unsubscribeFromNotifications = async () => {
        try {
            setIsLoading(true)

            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                // Unsubscribe from push
                await subscription.unsubscribe()

                // Notify backend
                const origin = window.location.origin
                await axios.post(`${base_url}/deactivate_push_notification`, {
                    subscription: subscription.toJSON(),
                    origin: origin
                })

                setIsSubscribed(false)
                console.log('✅ Push notification deactivated')
            }
        } catch (error) {
            console.error('Error unsubscribing from notifications:', error)
            alert('Failed to disable notifications. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {isChecking ? (
                <button className="notification-subscribe" disabled>
                    Checking... <img src={notification} alt="" />
                </button>
            ) : !isSubscribed ? (
                <Subscribe onClick={subscribeToNotifications} isLoading={isLoading} />
            ) : (
                <Unsubscribe onClick={unsubscribeFromNotifications} isLoading={isLoading} />
            )}
            <Notification_button_info />
        </>
    )
}

const Subscribe = ({ onClick, isLoading }) => {
    return (
        <button 
            className="notification-subscribe" 
            onClick={onClick}
            disabled={isLoading}
        >
            {isLoading ? 'Loading...' : 'Enable notification'} 
            <img src={notification} alt="" />
        </button>
    )
}

const Unsubscribe = ({ onClick, isLoading }) => {
    return (
        <button 
            className="notification-unsubscribe" 
            onClick={onClick}
            disabled={isLoading}
        >
            {isLoading ? 'Loading...' : 'Notification enabled'} 
            <img src={active_notification} alt="" />
        </button>
    )
}

const Notification_button_info = () => {
    return (
        <p className="notification-button-info">
            By turning on the notification, you'll be notified when the rendering is over.
        </p>
    )
}