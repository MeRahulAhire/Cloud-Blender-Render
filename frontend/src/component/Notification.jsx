import "../style/notification.css"
import notification from "../assets/icons/notification.svg"
import active_notification from "../assets/icons/notification_active.svg"
export default function Notification() {
  return (
    <>
    {/* <Subscribe/> */}
    <Unsubscribe/>
    <Notification_button_info/>
    </>
  )
}

const Subscribe = () => {
    return (
        <>
        <button className="notification-subscribe">
            Enable notification <img src={notification} alt="" />
        </button>
        
        </>
    )
}
const Unsubscribe = () => {
    return (
        <>
        <button className="notification-unsubscribe">
            Notification enabled <img src={active_notification} alt="" />
        </button>
        
        </>
    )
}


const Notification_button_info = () => {
    return (
        <>
        <p className="notification-button-info">
            By turning on the notification, you'll be notified when the rendering is over.
        </p>
        </>
    )
}