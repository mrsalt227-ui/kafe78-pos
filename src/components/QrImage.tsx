import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrImageProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrImage: React.FC<QrImageProps> = ({ value, size = 160, className = '' }) => {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: '#1C1C1E', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc('');
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={`bg-[#F2F2F7] rounded-lg animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code meja"
      className={`rounded-lg bg-white ${className}`}
    />
  );
};
