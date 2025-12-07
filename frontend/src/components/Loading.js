import React from 'react';
import '../styles/Loading.css';

const Loading = ({ message = "Đang tải..." }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner-wrapper">
        <div className="loading-spinner"></div>
        <div className="loading-text">{message}</div>
      </div>
    </div>
  );
};

export default Loading;
