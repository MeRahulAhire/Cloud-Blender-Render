import { useEffect } from "react"
import "../style/notification.css"
import notification from "../assets/icons/notification.svg"
import active_notification from "../assets/icons/notification_active.svg"
import notification_sound from "../assets/audio/notification.mp3"
import central_store from "./Store"
import axios from "axios"

const VAPID_PUBLIC_KEY = "BGdqGpTMThGXR1oAau7FddChScYzNwObQZfPNudix3uoSiwurNbx-8WdmLbhMekyalvnXZaV0tzA2kyWYNuoSbA"

export default function Notification() {
    const {
        isSubscribed,
        setIsSubscribed,
        isLoading,
        setIsLoading,
        isChecking,
        setIsChecking,
        base_url,
      } = central_store();

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

            // console.log('🔔 Starting notification subscription...')
            // console.log('Notification in window:', 'Notification' in window)
            // console.log('Current permission:', window.Notification?.permission)

            // Check if notifications are supported
            if (!window.Notification) {
                alert('This browser does not support notifications')
                setIsLoading(false)
                return
            }

            // Request notification permission
            let permission = window.Notification.permission
            
            if (permission === 'default') {
                // console.log('Requesting notification permission...')
                
                try {
                    // Use window.Notification to ensure we get the right reference
                    permission = await window.Notification.requestPermission()
                    // console.log('Permission result:', permission)
                } catch (e) {
                    console.error('Error requesting permission:', e)
                    alert('Failed to request notification permission')
                    setIsLoading(false)
                    return
                }
            } 
            
            // else {
            //     console.log('Using existing permission:', permission)
            // }

            // console.log('Final permission value:', permission)

            if (permission !== 'granted') {
                console.log('❌ Notification permission not granted:', permission)
                alert(`Notification permission is: ${permission}. Please allow notifications in your browser settings.`)
                setIsLoading(false)
                return
            }

            // console.log('✅ Notification permission granted!')

            // Register service worker if not already registered
            let registration
            if ('serviceWorker' in navigator) {
                // console.log('Registering service worker...')
                registration = await navigator.serviceWorker.register('/service-worker.js')
                // console.log('Service worker registered:', registration)
                await navigator.serviceWorker.ready
                // console.log('Service worker ready')
            } else {
                alert('Service workers not supported')
                setIsLoading(false)
                return
            }

            // Subscribe to push notifications
            // console.log('Subscribing to push notifications...')
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })
            // console.log('Push subscription created:', subscription)

            // Send subscription to backend
            const origin = window.location.origin
            // console.log('Sending subscription to backend...')
            const response = await axios.post(`${base_url}/activate_push_notification`, {
                subscription: subscription.toJSON(),
                origin: origin
            })
            // console.log('Backend response:', response.data)

            if (response.data.success) {
                setIsSubscribed(true)
                // console.log('✅ Push notification activated successfully!')
                // alert('Notifications enabled successfully!')
            }
        } catch (error) {
            console.error('❌ Error subscribing to notifications:', error)
            console.error('Error stack:', error.stack)
            alert(`Failed to enable notifications: ${error.message}`)
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
                // console.log('✅ Push notification deactivated')
            }
        } catch (error) {
            // console.error('Error unsubscribing from notifications:', error)
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