import React from 'react';

const NotificationModal = ({ handleEnableNotifications, handleLater }) => {
  return (
    // لایه تاریک و نیمه‌شفاف پشت پاپ‌آپ
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      {/* باکس اصلی مدال */}
      <div style={{
        backgroundColor: 'white', padding: '32px 24px', borderRadius: '24px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '340px',
        textAlign: 'center', direction: 'rtl',
        // fontFamily: 'Vazirmatn, Tahoma, sans-serif', // این خط حذف شده است
        position: 'relative'
      }}>
        
        {/* دکمه ضربدر بالای صفحه */}
        <button onClick={handleLater} style={{
          position: 'absolute', top: '16px', left: '16px', background: 'none',
          border: 'none', fontSize: '18px', color: '#999', cursor: 'pointer'
        }}>✕</button>

        {/* دایره آیکون زنگوله با رنگ اختصاصی شما */}
        <div style={{
          width: '60px', height: '60px', backgroundColor: '#8FAE55',
          borderRadius: '50%', display: 'flex', justifyContent: 'center',
          alignItems: 'center', margin: '0 auto 20px auto',
          boxShadow: '0 4px 12px rgba(143, 174, 85, 0.3)'
        }}>
          {/* آیکون زنگوله سفید رنگ */}
          <span style={{ fontSize: '26px', color: 'white' }}>🔔</span>
        </div>

        {/* تیتر انتخابی شما */}
        <h3 style={{ margin: '0 0 12px 0', color: '#1a1a1a', fontSize: '20px', fontWeight: 'bold' }}>
          چیزی را از دست ندهید!
        </h3>
        
        {/* متن نهایی و تایید شده شما */}
        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px', lineHeight: '1.7' }}>
          با فعال‌سازی اعلان‌ها، وضعیت رزروها و جشنواره‌های تخفیفی را فوراً به شما اطلاع می‌دهیم.
        </p>

        {/* دکمه اصلی فعال‌سازی با رنگ سبز برند شما */}
        <button onClick={handleEnableNotifications} style={{
          width: '100%', padding: '12px', backgroundColor: '#8FAE55',
          color: 'white', border: 'none', borderRadius: '12px',
          fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
          marginBottom: '12px', transition: 'background 0.2s'
        }}>
          فعال‌سازی اعلان‌ها
        </button>

        {/* دکمه بعدا با حاشیه رنگی */}
        <button onClick={handleLater} style={{
          width: '100%', padding: '12px', backgroundColor: 'transparent',
          color: '#8FAE55', border: '2px solid #8FAE55', borderRadius: '12px',
          fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
        }}>
          بعداً شاید
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;
