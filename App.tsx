
import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { Inbound } from './Inbound';
import { Outbound } from './Outbound';
import { Inventory } from './Inventory';
import { SerialTracking } from './SerialTracking';
import { Settings } from './Settings';
import { ProductionCheck } from './ProductionCheck';
import { SalesOrders } from './SalesOrders';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      setCurrentPath(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) window.location.hash = '/';
    else handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  let Content = Dashboard;
  switch (currentPath) {
    case '/inbound': Content = Inbound; break;
    case '/outbound': Content = Outbound; break;
    case '/inventory': Content = Inventory; break;
    case '/tracking': Content = SerialTracking; break;
    case '/production-check': Content = ProductionCheck; break;
    case '/sales-orders': Content = SalesOrders; break;
    case '/settings': Content = Settings; break;
    default: Content = Dashboard;
  }

  return (
    <Layout currentPath={currentPath} onNavigate={navigate}>
      <Content />
    </Layout>
  );
};

export default App;
