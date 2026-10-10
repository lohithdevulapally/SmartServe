import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Available demo users / personas
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smartserve_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState('T-2');
  const [activeDashboard, setActiveDashboard] = useState(() => {
    try {
      const saved = localStorage.getItem('smartserve_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'admin') return 'admin';
        if (u.role === 'waiter' || u.role === 'kitchen') return 'service';
      }
    } catch (e) {}
    return 'customer';
  });

  // Cart State
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('smartserve_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Global Toast Notifications
  const [toasts, setToasts] = useState([]);
  
  // WebSocket Connection State & Event Counter for triggering refetches
  const [wsConnected, setWsConnected] = useState(false);
  const [wsEvent, setWsEvent] = useState(null);
  const wsRef = useRef(null);

  // Sound chime using Web Audio API
  const playChime = useCallback((type = 'notification') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'order') {
        // High pleasant dual chime
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } else {
        // Soft bubble chime
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // AudioContext might be blocked until user gesture, safe to ignore
    }
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    playChime(type === 'success' || type === 'order' ? 'order' : 'notification');

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, [playChime]);

  // Persist cart
  useEffect(() => {
    localStorage.setItem('smartserve_cart', JSON.stringify(cart));
  }, [cart]);

  // Load users
  useEffect(() => {
    api.getUsers()
      .then(userList => {
        setUsers(userList);
      })
      .catch(err => console.error('Failed to load users:', err));
  }, []);

  // Initialize WebSocket Connection
  useEffect(() => {
    let socket;
    let reconnectTimer;

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setWsEvent(data);

            // Handle user-friendly notifications
            if (data.type === 'ORDER_CREATED') {
              addToast(`New Order #${data.data.order_number} placed!`, 'order');
            } else if (data.type === 'ORDER_STATUS_CHANGED') {
              addToast(`Order #${data.data.order_id} status updated to: ${data.data.status.toUpperCase()}`, 'info');
            } else if (data.type === 'INVENTORY_UPDATED') {
              addToast('Live inventory updated across stations.', 'warning');
            } else if (data.type === 'SERVICE_REQUEST_CREATED') {
              addToast(`Service buzzer: Table ${data.data.table_number} requested ${data.data.request_type}!`, 'order');
            } else if (data.type === 'MENU_AVAILABILITY_CHANGED') {
              addToast('Menu item stock & availability refreshed.', 'info');
            } else if (data.type === 'COMPENSATION_ISSUED') {
              addToast(`Compensation granted to ${data.data.customer_name}`, 'success');
            }
          } catch (e) {
            console.error('WS Parse Error:', e);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWS, 3000);
        };

        socket.onerror = () => {
          setWsConnected(false);
        };
      } catch (err) {
        console.error('WS Connection error:', err);
        reconnectTimer = setTimeout(connectWS, 3000);
      }
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [addToast]);

  // Cart operations
  const addToCart = (dish, quantity = 1, options = {}, instructions = '') => {
    if (!dish.is_available) {
      addToast(`"${dish.name}" is currently out of stock!`, 'warning');
      return false;
    }

    setCart(prev => {
      // Check if identical item with identical options already in cart
      const existingIdx = prev.findIndex(item => 
        item.dish.id === dish.id && 
        JSON.stringify(item.options) === JSON.stringify(options) &&
        item.instructions === instructions
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [...prev, { dish, quantity, options, instructions, cartItemId: Date.now() + Math.random() }];
      }
    });

    addToast(`Added ${quantity}x "${dish.name}" to cart`, 'success');
    return true;
  };

  const updateCartQty = (cartItemId, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    } else {
      setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: newQty } : item));
    }
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => setCart([]);

  const cartSubtotal = cart.reduce((sum, item) => {
    let itemPrice = item.dish.price;
    // Add extra price for selected options if any
    Object.values(item.options || {}).forEach(opt => {
      if (opt && typeof opt.price === 'number') itemPrice += opt.price;
    });
    return sum + (itemPrice * item.quantity);
  }, 0);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // User Authentication: Login (Admin & Service Staff with Credentials)
  const login = async (username, password) => {
    try {
      const res = await api.login({ username, password });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('smartserve_user', JSON.stringify(res.user));
        if (res.token) localStorage.setItem('smartserve_token', res.token);
        setIsAuthModalOpen(false);

        // Auto adjust active dashboard based on role
        if (res.user.role === 'admin') setActiveDashboard('admin');
        else if (res.user.role === 'waiter' || res.user.role === 'kitchen') setActiveDashboard('service');
        else setActiveDashboard('customer');

        addToast(res.message || `Welcome back, ${res.user.full_name}!`, 'success');
        return res.user;
      }
    } catch (err) {
      addToast(err.message || 'Login failed', 'warning');
      throw err;
    }
  };

  // Customer Authentication (Dining Guests: Name + Phone Number)
  const customerLogin = async ({ full_name, phone, table_number }) => {
    try {
      const res = await api.customerLogin({ full_name, phone, table_number });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('smartserve_user', JSON.stringify(res.user));
        if (res.token) localStorage.setItem('smartserve_token', res.token);
        if (table_number) setSelectedTable(table_number);
        setIsAuthModalOpen(false);
        setActiveDashboard('customer');
        addToast(res.message, 'success');
        return res.user;
      }
    } catch (err) {
      addToast(err.message || 'Customer sign-in failed', 'warning');
      throw err;
    }
  };

  // User Authentication: Register
  const register = async (userData) => {
    try {
      const res = await api.register(userData);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('smartserve_user', JSON.stringify(res.user));
        if (res.token) localStorage.setItem('smartserve_token', res.token);
        setIsAuthModalOpen(false);

        // Refresh user list for persona switches
        api.getUsers().then(setUsers).catch(() => {});

        if (res.user.role === 'admin') setActiveDashboard('admin');
        else if (res.user.role === 'waiter' || res.user.role === 'kitchen') setActiveDashboard('service');
        else setActiveDashboard('customer');

        addToast(res.message || `Welcome to SmartServe, ${res.user.full_name}!`, 'success');
        return res.user;
      }
    } catch (err) {
      addToast(err.message || 'Registration failed', 'warning');
      throw err;
    }
  };

  // User Authentication: Logout
  const logout = async () => {
    try {
      if (currentUser) {
        await api.logout({ userId: currentUser.id, userName: currentUser.full_name, role: currentUser.role });
      }
    } catch (e) {}
    localStorage.removeItem('smartserve_user');
    localStorage.removeItem('smartserve_token');
    setCurrentUser(null);
    setIsAuthModalOpen(false);
    addToast('You have been signed out.', 'info');
  };

  // Switch persona handler
  const switchUser = (userId) => {
    const user = users.find(u => u.id === Number(userId));
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('smartserve_user', JSON.stringify(user));
      addToast(`Switched active profile to ${user.full_name} (${user.role.toUpperCase()})`, 'info');
      // Auto adjust active dashboard to match role if appropriate
      if (user.role === 'admin') setActiveDashboard('admin');
      else if (user.role === 'waiter' || user.role === 'kitchen') setActiveDashboard('service');
      else setActiveDashboard('customer');
    }
  };

  return (
    <AppContext.Provider value={{
      users,
      currentUser,
      login,
      customerLogin,
      register,
      logout,
      isAuthModalOpen,
      setIsAuthModalOpen,
      switchUser,
      selectedTable,
      setSelectedTable,
      activeDashboard,
      setActiveDashboard,
      cart,
      addToCart,
      updateCartQty,
      removeFromCart,
      clearCart,
      cartSubtotal,
      cartItemCount,
      toasts,
      addToast,
      showToast: addToast,
      wsConnected,
      wsEvent,
      playChime
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
