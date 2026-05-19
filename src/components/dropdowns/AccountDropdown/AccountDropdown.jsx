import "./AccountDropdown.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const AccountDropdown = ({
  isOpen = false,
  account = null,
  onClose,
  onOpenAccountPage,
  onOpenPreferences,
  onOpenSecurity,
  onOpenActivity,
  onOpenAdminPanel,
  onDisconnect,
  isAdmin = false,
  anchorRef = null, // NEW: Accept anchor ref for positioning
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const [desktopPosition, setDesktopPosition] = useState({
    top: 76,
    left: null,
    right: 20,
  });
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false,
  );

  // Body scroll lock - only on mobile
  useEffect(() => {
    if (!isOpen) return undefined;
    if (typeof window === "undefined") return undefined;

    // Desktop dropdowns should not lock the page like a modal.
    if (window.innerWidth >= 768) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isOpen]);

  // Desktop detection effect
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateMode = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    updateMode();

    window.addEventListener("resize", updateMode);

    return () => {
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  // Desktop positioning logic
  const updateDesktopPosition = () => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) return;

    const anchorEl = anchorRef?.current;
    const dialogEl = dialogRef.current;

    if (!dialogEl) return;

    const dialogWidth = dialogEl.offsetWidth || 340;
    const viewportWidth = window.innerWidth;
    const gap = 12;
    const minMargin = 12;

    if (!anchorEl) {
      setDesktopPosition({
        top: 82,
        left: Math.max(minMargin, viewportWidth - dialogWidth - 20),
        right: "auto",
      });
      return;
    }

    const rect = anchorEl.getBoundingClientRect();

    let left = rect.right - dialogWidth;

    left = Math.max(minMargin, left);
    left = Math.min(left, viewportWidth - dialogWidth - minMargin);

    setDesktopPosition({
      top: rect.bottom + gap,
      left,
      right: "auto",
    });
  };

  // Position update on open/resize/scroll
  useEffect(() => {
    if (!isOpen) return undefined;

    const frame = window.requestAnimationFrame(updateDesktopPosition);

    const handleResize = () => updateDesktopPosition();
    const handleScroll = () => updateDesktopPosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, anchorRef]);

  // Real desktop outside-click handling
  useEffect(() => {
    if (!isOpen || !isDesktop) return undefined;

    const handlePointerDown = (event) => {
      const dialogEl = dialogRef.current;
      const anchorEl = anchorRef?.current;

      if (dialogEl?.contains(event.target)) return;
      if (anchorEl?.contains(event.target)) return;

      onClose?.();
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, isDesktop, anchorRef, onClose]);

  if (!isOpen || !account) return null;

  const handleAction = (callback) => {
    if (onClose) onClose();
    if (callback) callback();
  };

  return (
    <ModalPortal>
      <div
        className={`account-modal ${
          isDesktop ? "account-modal--desktop" : "account-modal--mobile"
        }`}
        role="presentation"
      >
        {/* Backdrop for click-outside — mobile only */}
        {!isDesktop && (
          <div className="account-modal__backdrop" onClick={onClose} />
        )}

        <div
          ref={dialogRef}
          className={`account-modal__dialog ${
            isDesktop ? "account-modal__dialog--desktop" : "account-modal__dialog--mobile"
          } glass-panel theme-transition`}
          role="dialog"
          aria-label={t("accountDropdown.ariaLabel", "Account menu")}
          onClick={(event) => event.stopPropagation()}
          style={
            isDesktop
              ? {
                  position: "fixed",
                  top: `${desktopPosition.top}px`,
                  left:
                    typeof desktopPosition.left === "number"
                      ? `${desktopPosition.left}px`
                      : "auto",
                  right:
                    typeof desktopPosition.right === "number"
                      ? `${desktopPosition.right}px`
                      : desktopPosition.right || "auto",
                  width: "340px",
                  minWidth: "340px",
                  maxWidth: "340px",
                }
              : undefined
          }
        >
          <div className="account-dropdown__header">
            <div className="account-dropdown__title-group">
              <h3 className="account-dropdown__title">
                {t("accountDropdown.title", "Account")}
              </h3>
              <p className="account-dropdown__subtitle soft-text">
                {t("accountDropdown.subtitle", "Profile and preferences")}
              </p>
            </div>

            <button
              type="button"
              className="account-dropdown__close"
              onClick={onClose}
              aria-label={t("accountDropdown.closeAriaLabel", "Close account menu")}
            >
              ✕
            </button>
          </div>

          <div className="account-dropdown__profile">
            <div className="account-dropdown__avatar">
              {account.initials || "U"}
            </div>

            <div className="account-dropdown__identity">
              <p className="account-dropdown__name">{account.name}</p>
              <p className="account-dropdown__meta soft-text">
                {account.emailOrWallet}
              </p>
            </div>
          </div>

          <div className="account-dropdown__chips">
            <span className="account-dropdown__chip">
              {account.status || t("accountDropdown.status.active", "Active")}
            </span>
            <span className="account-dropdown__chip">
              {t("accountDropdown.level", "Level {{level}}", {
                level: account.level || 1,
              })}
            </span>
            {isAdmin && (
              <span className="account-dropdown__chip admin-chip">
                🔧 {t("accountDropdown.adminChip", "Admin")}
              </span>
            )}
          </div>

          <div className="account-dropdown__menu">
            <button
              type="button"
              className="account-dropdown__item"
              onClick={() => handleAction(onOpenAccountPage)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">👤</span>
                <span className="account-dropdown__item-text">
                  {t("accountDropdown.items.myAccount", "My Account")}
                </span>
              </span>
              <span className="account-dropdown__item-arrow">›</span>
            </button>

            <button
              type="button"
              className="account-dropdown__item"
              onClick={() => handleAction(onOpenPreferences)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">⚙️</span>
                <span className="account-dropdown__item-text">
                  {t("accountDropdown.items.preferences", "Preferences")}
                </span>
              </span>
              <span className="account-dropdown__item-arrow">›</span>
            </button>

            <button
              type="button"
              className="account-dropdown__item"
              onClick={() => handleAction(onOpenSecurity)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">🔐</span>
                <span className="account-dropdown__item-text">
                  {t("accountDropdown.items.security", "Security")}
                </span>
              </span>
              <span className="account-dropdown__item-arrow">›</span>
            </button>

            <button
              type="button"
              className="account-dropdown__item"
              onClick={() => handleAction(onOpenActivity)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">🧾</span>
                <span className="account-dropdown__item-text">
                  {t("accountDropdown.items.activity", "Activity")}
                </span>
              </span>
              <span className="account-dropdown__item-arrow">›</span>
            </button>

            {/* Admin Panel - Only shown if user is multisig owner */}
            {isAdmin && (
              <button
                type="button"
                className="account-dropdown__item admin-item"
                onClick={() => handleAction(onOpenAdminPanel)}
              >
                <span className="account-dropdown__item-left">
                  <span className="account-dropdown__item-icon">🛡️</span>
                  <span className="account-dropdown__item-text">
                    {t("accountDropdown.items.adminPanel", "Admin Panel")}
                  </span>
                </span>
                <span className="account-dropdown__item-arrow">›</span>
              </button>
            )}

            <button
              type="button"
              className="account-dropdown__item account-dropdown__item--danger"
              onClick={() => handleAction(onDisconnect)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">↪</span>
                <span className="account-dropdown__item-text">
                  {t("accountDropdown.items.disconnect", "Disconnect")}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AccountDropdown;












// import "./AccountDropdown.css";
// import { useEffect, useRef, useState } from "react";
// import { createPortal } from "react-dom";

// function ModalPortal({ children }) {
//   if (typeof document === "undefined") return null;
//   return createPortal(children, document.body);
// }

// const AccountDropdown = ({
//   isOpen = false,
//   account = null,
//   onClose,
//   onOpenAccountPage,
//   onOpenPreferences,
//   onOpenSecurity,
//   onOpenActivity,
//   onOpenAdminPanel,
//   onDisconnect,
//   isAdmin = false,
//   anchorRef = null, // NEW: Accept anchor ref for positioning
// }) => {
//   const dialogRef = useRef(null);
//   const [desktopPosition, setDesktopPosition] = useState({
//     top: 76,
//     left: null,
//     right: 20,
//   });
//   const [isDesktop, setIsDesktop] = useState(
//     typeof window !== "undefined" ? window.innerWidth >= 768 : false,
//   );

//   // Body scroll lock - only on mobile
//   useEffect(() => {
//     if (!isOpen) return undefined;
//     if (typeof window === "undefined") return undefined;

//     // Desktop dropdowns should not lock the page like a modal.
//     if (window.innerWidth >= 768) return undefined;

//     const previousOverflow = document.body.style.overflow;
//     const previousTouchAction = document.body.style.touchAction;

//     document.body.style.overflow = "hidden";
//     document.body.style.touchAction = "none";

//     return () => {
//       document.body.style.overflow = previousOverflow;
//       document.body.style.touchAction = previousTouchAction;
//     };
//   }, [isOpen]);

//   // Desktop detection effect
//   useEffect(() => {
//     if (typeof window === "undefined") return undefined;

//     const updateMode = () => {
//       setIsDesktop(window.innerWidth >= 768);
//     };

//     updateMode();

//     window.addEventListener("resize", updateMode);

//     return () => {
//       window.removeEventListener("resize", updateMode);
//     };
//   }, []);

//   // Desktop positioning logic
//   const updateDesktopPosition = () => {
//     if (typeof window === "undefined") return;
//     if (window.innerWidth < 768) return;

//     const anchorEl = anchorRef?.current;
//     const dialogEl = dialogRef.current;

//     if (!dialogEl) return;

//     const dialogWidth = dialogEl.offsetWidth || 340;
//     const viewportWidth = window.innerWidth;
//     const gap = 12;
//     const minMargin = 12;

//     if (!anchorEl) {
//       setDesktopPosition({
//         top: 82,
//         left: Math.max(minMargin, viewportWidth - dialogWidth - 20),
//         right: "auto",
//       });
//       return;
//     }

//     const rect = anchorEl.getBoundingClientRect();

//     let left = rect.right - dialogWidth;

//     left = Math.max(minMargin, left);
//     left = Math.min(left, viewportWidth - dialogWidth - minMargin);

//     setDesktopPosition({
//       top: rect.bottom + gap,
//       left,
//       right: "auto",
//     });
//   };

//   // Position update on open/resize/scroll
//   useEffect(() => {
//     if (!isOpen) return undefined;

//     const frame = window.requestAnimationFrame(updateDesktopPosition);

//     const handleResize = () => updateDesktopPosition();
//     const handleScroll = () => updateDesktopPosition();

//     window.addEventListener("resize", handleResize);
//     window.addEventListener("scroll", handleScroll, true);

//     return () => {
//       window.cancelAnimationFrame(frame);
//       window.removeEventListener("resize", handleResize);
//       window.removeEventListener("scroll", handleScroll, true);
//     };
//   }, [isOpen, anchorRef]);

//   // Real desktop outside-click handling
//   useEffect(() => {
//     if (!isOpen || !isDesktop) return undefined;

//     const handlePointerDown = (event) => {
//       const dialogEl = dialogRef.current;
//       const anchorEl = anchorRef?.current;

//       if (dialogEl?.contains(event.target)) return;
//       if (anchorEl?.contains(event.target)) return;

//       onClose?.();
//     };

//     document.addEventListener("mousedown", handlePointerDown);

//     return () => {
//       document.removeEventListener("mousedown", handlePointerDown);
//     };
//   }, [isOpen, isDesktop, anchorRef, onClose]);

//   if (!isOpen || !account) return null;

//   const handleAction = (callback) => {
//     if (onClose) onClose();
//     if (callback) callback();
//   };

//   return (
//     <ModalPortal>
//       <div className="account-modal" role="presentation">
//         {/* Backdrop for click-outside — mobile only */}
//         {!isDesktop && (
//           <div className="account-modal__backdrop" onClick={onClose} />
//         )}

//         <div
//           ref={dialogRef}
//           className="account-modal__dialog glass-panel theme-transition"
//           role="dialog"
//           aria-label="Account menu"
//           onClick={(event) => event.stopPropagation()}
//           style={
//             isDesktop
//               ? {
//                   top: `${desktopPosition.top}px`,
//                   left:
//                     typeof desktopPosition.left === "number"
//                       ? `${desktopPosition.left}px`
//                       : "auto",
//                   right:
//                     typeof desktopPosition.right === "number"
//                       ? `${desktopPosition.right}px`
//                       : desktopPosition.right || "auto",
//                 }
//               : undefined
//           }
//         >
//           <div className="account-dropdown__header">
//             <div className="account-dropdown__title-group">
//               <h3 className="account-dropdown__title">Account</h3>
//               <p className="account-dropdown__subtitle soft-text">
//                 Profile and preferences
//               </p>
//             </div>

//             <button
//               type="button"
//               className="account-dropdown__close"
//               onClick={onClose}
//               aria-label="Close account menu"
//             >
//               ✕
//             </button>
//           </div>

//           <div className="account-dropdown__profile">
//             <div className="account-dropdown__avatar">
//               {account.initials || "U"}
//             </div>

//             <div className="account-dropdown__identity">
//               <p className="account-dropdown__name">{account.name}</p>
//               <p className="account-dropdown__meta soft-text">
//                 {account.emailOrWallet}
//               </p>
//             </div>
//           </div>

//           <div className="account-dropdown__chips">
//             <span className="account-dropdown__chip">
//               {account.status || "Active"}
//             </span>
//             <span className="account-dropdown__chip">
//               Level {account.level || 1}
//             </span>
//             {isAdmin && (
//               <span className="account-dropdown__chip admin-chip">
//                 🔧 Admin
//               </span>
//             )}
//           </div>

//           <div className="account-dropdown__menu">
//             <button
//               type="button"
//               className="account-dropdown__item"
//               onClick={() => handleAction(onOpenAccountPage)}
//             >
//               <span className="account-dropdown__item-left">
//                 <span className="account-dropdown__item-icon">👤</span>
//                 <span className="account-dropdown__item-text">My Account</span>
//               </span>
//               <span className="account-dropdown__item-arrow">›</span>
//             </button>

//             <button
//               type="button"
//               className="account-dropdown__item"
//               onClick={() => handleAction(onOpenPreferences)}
//             >
//               <span className="account-dropdown__item-left">
//                 <span className="account-dropdown__item-icon">⚙️</span>
//                 <span className="account-dropdown__item-text">Preferences</span>
//               </span>
//               <span className="account-dropdown__item-arrow">›</span>
//             </button>

//             <button
//               type="button"
//               className="account-dropdown__item"
//               onClick={() => handleAction(onOpenSecurity)}
//             >
//               <span className="account-dropdown__item-left">
//                 <span className="account-dropdown__item-icon">🔐</span>
//                 <span className="account-dropdown__item-text">Security</span>
//               </span>
//               <span className="account-dropdown__item-arrow">›</span>
//             </button>

//             <button
//               type="button"
//               className="account-dropdown__item"
//               onClick={() => handleAction(onOpenActivity)}
//             >
//               <span className="account-dropdown__item-left">
//                 <span className="account-dropdown__item-icon">🧾</span>
//                 <span className="account-dropdown__item-text">Activity</span>
//               </span>
//               <span className="account-dropdown__item-arrow">›</span>
//             </button>

//             {/* Admin Panel - Only shown if user is multisig owner */}
//             {isAdmin && (
//               <button
//                 type="button"
//                 className="account-dropdown__item admin-item"
//                 onClick={() => handleAction(onOpenAdminPanel)}
//               >
//                 <span className="account-dropdown__item-left">
//                   <span className="account-dropdown__item-icon">🛡️</span>
//                   <span className="account-dropdown__item-text">
//                     Admin Panel
//                   </span>
//                 </span>
//                 <span className="account-dropdown__item-arrow">›</span>
//               </button>
//             )}

//             <button
//               type="button"
//               className="account-dropdown__item account-dropdown__item--danger"
//               onClick={() => handleAction(onDisconnect)}
//             >
//               <span className="account-dropdown__item-left">
//                 <span className="account-dropdown__item-icon">↪</span>
//                 <span className="account-dropdown__item-text">Disconnect</span>
//               </span>
//             </button>
//           </div>
//         </div>
//       </div>
//     </ModalPortal>
//   );
// };

// export default AccountDropdown;
