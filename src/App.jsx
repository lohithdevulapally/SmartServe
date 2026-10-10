import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotFoundPage from './components/NotFoundPage';
import ToastContainer from './components/ToastContainer';
import CustomerDashboardMain from './components/CustomerDashboard/CustomerDashboardMain';
import AdminDashboardMain from './components/AdminDashboard/AdminDashboardMain';
import ServiceStaffDashboardMain from './components/ServiceStaffDashboard/ServiceStaffDashboardMain';
import LoginPage from './components/Auth/LoginPage';

function MainAppContent() {
  const { currentUser } = useApp();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [is404Active, setIs404Active] = useState(window.location.hash === '#404');

  // Listen to hash change for direct URL / #404 test navigation
  useEffect(() => {
    const handleHashChange = () => {
      setIs404Active(window.location.hash === '#404');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Dynamic SEO Page Titles based on Active User State and Role
  useEffect(() => {
    if (is404Active) {
      document.title = 'SmartServe — 404 Table Not Found';
    } else if (!currentUser) {
      document.title = 'SmartServe — Dining Check-In & Staff Authentication';
    } else if (currentUser.role === 'customer') {
      document.title = 'SmartServe — Artisanal Dining & Live Guest Menu';
    } else if (currentUser.role === 'admin') {
      document.title = 'SmartServe — Executive Restaurant Management Console';
    } else if (currentUser.role === 'kitchen') {
      document.title = 'SmartServe — Culinary Kitchen Display System (KDS)';
    } else if (currentUser.role === 'waiter') {
      document.title = 'SmartServe — Floor Service & Table Operations';
    } else {
      document.title = 'SmartServe — Smart Restaurant Management Platform';
    }
  }, [currentUser, is404Active]);

  // If user is not logged in and not on 404 test page, show login portal
  if (!currentUser && !is404Active) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <LoginPage />
        <Footer onTrigger404={() => { setIs404Active(true); window.location.hash = '404'; }} />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenServiceModal={() => setIsServiceOpen(true)}
      />

      <main style={{ flex: 1, width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
        {is404Active ? (
          <NotFoundPage onResetHome={() => {
            setIs404Active(false);
            window.location.hash = '';
          }} />
        ) : (
          <>
            {/* CUSTOMER VIEW: Rendered ONLY for Customers */}
            {currentUser?.role === 'customer' && (
              <CustomerDashboardMain
                isCartOpen={isCartOpen}
                onCloseCart={() => setIsCartOpen(false)}
                isServiceOpen={isServiceOpen}
                onCloseService={() => setIsServiceOpen(false)}
              />
            )}

            {/* ADMIN VIEW: Rendered ONLY for Administrators */}
            {currentUser?.role === 'admin' && (
              <AdminDashboardMain />
            )}

            {/* SERVICE STAFF VIEW: Rendered ONLY for Waiters & Kitchen Chefs */}
            {(currentUser?.role === 'waiter' || currentUser?.role === 'kitchen') && (
              <ServiceStaffDashboardMain />
            )}
          </>
        )}
      </main>

      <ToastContainer />

      {/* Complete Responsive Global Footer with Clickable Phone, Email, Modal Links & Dynamic Copyright Year */}
      <Footer onTrigger404={() => {
        setIs404Active(true);
        window.location.hash = '404';
      }} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
