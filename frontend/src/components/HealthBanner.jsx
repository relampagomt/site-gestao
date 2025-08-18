import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import api from '@/services/api';

const HealthBanner = () => {
  const [status, setStatus] = useState('checking'); // 'checking', 'healthy', 'unhealthy'
  const [lastCheck, setLastCheck] = useState(null);

  const checkHealth = async () => {
    try {
      setStatus('checking');
      const response = await api.get('/healthcheck', { timeout: 5000 });
      if (response.data?.status === 'ok') {
        setStatus('healthy');
      } else {
        setStatus('unhealthy');
      }
      setLastCheck(new Date());
    } catch (error) {
      setStatus('unhealthy');
      setLastCheck(new Date());
      console.warn('Health check failed:', error.message);
    }
  };

  useEffect(() => {
    // Initial check
    checkHealth();

    // Check every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Don't show banner if healthy
  if (status === 'healthy') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'checking':
        return {
          icon: Wifi,
          text: 'Verificando conexão com servidor...',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
        };
      case 'unhealthy':
        return {
          icon: WifiOff,
          text: 'Problemas de conexão com servidor. Algumas funcionalidades podem estar indisponíveis.',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
        };
      default:
        return {
          icon: CheckCircle,
          text: 'Sistema funcionando normalmente',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border-l-4 border-l-current p-3 mb-4`}>
      <div className="flex items-center">
        <Icon className={`w-5 h-5 ${config.iconColor} mr-3 flex-shrink-0`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.textColor}`}>
            {config.text}
          </p>
          {lastCheck && (
            <p className={`text-xs ${config.textColor} opacity-75 mt-1`}>
              Última verificação: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </div>
        {status === 'unhealthy' && (
          <button
            onClick={checkHealth}
            className={`ml-3 text-xs ${config.textColor} underline hover:no-underline`}
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
};

export default HealthBanner;

