import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const Card = ({ children, className = '', title }) => {
  return (
    <div className={`card ${className}`}>
      {title && <div className="card-header">{title}</div>}
      {children}
    </div>
  );
};

export const StatCard = ({ title, value, icon: Icon, trend, trendValue }) => {
  const isTrendUp = trend === 'up';
  
  return (
    <div className="card stat-card">
      <div className="stat-header">
        {title}
        {Icon && (
          <div className="stat-icon">
            <Icon size={20} />
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {trend && (
        <div className={`stat-trend ${isTrendUp ? 'trend-up' : 'trend-down'}`}>
          {isTrendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trendValue}
        </div>
      )}
    </div>
  );
};
